const jwt = require('jsonwebtoken');
const { Cashfree, CFEnvironment } = require('cashfree-pg');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

/**
 * cashfree-pg v5+ requires credentials on the instance:
 *   new Cashfree(CFEnvironment.SANDBOX, clientId, clientSecret)
 * Static Cashfree.XClientId assignments are NOT used by the instance — missing creds → Cashfree 401.
 */
function getCashfreeClient() {
  const appId = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID;
  const secret = process.env.CASHFREE_SECRET_KEY || process.env.CASHFREE_CLIENT_SECRET;
  if (!appId || !secret) {
    const err = new Error(
      'Cashfree is not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in backend/.env'
    );
    err.statusCode = 503;
    throw err;
  }
  const useProd = process.env.CASHFREE_ENV === 'production';
  const env = useProd ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;
  return new Cashfree(env, appId, secret);
}

// @desc    Create Cashfree Order
// @route   POST /api/payments/create-order
// @access  Private
const createOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to pay for this booking' });
    }

    const cashfree = getCashfreeClient();

    const orderId = `order_${booking._id}_${Date.now()}`;
    const phone =
      (req.user.phone && String(req.user.phone).replace(/\D/g, '').slice(-10)) ||
      '9999999999';

    const orderAmount = Number(Number(booking.totalAmount || 0).toFixed(2));
    if (!orderAmount || orderAmount < 1) {
      return res.status(400).json({ message: 'Invalid order amount for payment' });
    }

    const frontendBase =
      (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

    const request = {
      order_amount: orderAmount,
      order_currency: 'INR',
      order_id: orderId,
      customer_details: {
        customer_id: req.user._id.toString(),
        customer_phone: phone.length === 10 ? phone : '9999999999',
        customer_name: (req.user.name && String(req.user.name).slice(0, 50)) || 'Customer',
      },
      order_meta: {
        return_url: `${frontendBase}/payment-status?order_id={order_id}&booking_id=${booking._id}`,
      },
    };

    const response = await cashfree.PGCreateOrder(request);

    booking.orderId = orderId;
    await booking.save();

    res.json({
      orderId: response.data.order_id,
      paymentSessionId: response.data.payment_session_id,
    });
  } catch (error) {
    const status = error.response?.status || error.statusCode;
    const msg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message;
    console.error('Cashfree create-order error:', error.response?.data || error.message);
    if (status === 401 || status === 403) {
      return res.status(502).json({
        message:
          'Cashfree rejected the request (invalid keys or environment). Check CASHFREE_APP_ID, CASHFREE_SECRET_KEY, and CASHFREE_ENV in .env',
        detail: msg,
      });
    }
    if (error.statusCode === 503) {
      return res.status(503).json({ message: msg });
    }
    res.status(500).json({ message: msg || 'Error creating Cashfree order' });
  }
};

// @desc    Verify Cashfree Payment (public: return URL works even if JWT/session is flaky)
// @route   POST /api/payments/verify
// @access  Public (validated with bookingId + orderId match on booking)
const verifyPayment = async (req, res) => {
  try {
    const { orderId, bookingId } = req.body;
    if (!orderId || !bookingId) {
      return res.status(400).json({ message: 'orderId and bookingId are required' });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      orderId: String(orderId),
    });

    if (!booking) {
      return res.status(400).json({ message: 'Invalid or expired payment session' });
    }

    // If client sends JWT, it must match the booking owner (extra safety when logged in)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.id && booking.userId.toString() !== String(decoded.id)) {
          return res.status(403).json({ message: 'Not authorized to verify this booking' });
        }
      } catch {
        // ignore invalid token for verify — DB gate above still applies
      }
    }

    if (booking.paymentStatus === 'Paid') {
      return res.json({ message: 'Payment already confirmed' });
    }

    const cashfree = getCashfreeClient();
    const response = await cashfree.PGOrderFetchPayments(String(orderId));
    const payments = Array.isArray(response.data) ? response.data : [];
    const successfulPayment = payments.find(
      (p) =>
        p.payment_status === 'SUCCESS' ||
        p.payment_status === 'Success' ||
        p.payment_status === 'success'
    );

    if (successfulPayment) {
      booking.paymentStatus = 'Paid';
      const now = new Date();
      const start = new Date(booking.startDate);
      const end = new Date(booking.endDate);
      if (now >= start && now <= end) {
        booking.bookingStatus = 'Active';
      } else if (now < start) {
        booking.bookingStatus = 'Confirmed';
      } else {
        booking.bookingStatus = 'Completed';
      }
      const cfPayId =
        successfulPayment.cf_payment_id != null
          ? String(successfulPayment.cf_payment_id)
          : successfulPayment.payment_id != null
            ? String(successfulPayment.payment_id)
            : '';
      if (cfPayId) booking.paymentId = cfPayId;
      await booking.save();

      const existingPay = await Payment.findOne({
        bookingId: booking._id,
        status: 'Completed',
      });
      if (!existingPay) {
        await Payment.create({
          userId: booking.userId,
          bookingId: booking._id,
          amount: booking.totalAmount,
          paymentMethod: 'Cashfree',
          transactionId: cfPayId || `cf_${booking._id}`,
          status: 'Completed',
        });
      }

      return res.json({ message: 'Payment verified and booking confirmed successfully' });
    }

    const statusUpper = (s) => String(s || '').toUpperCase();
    const hasFailed = payments.some((p) =>
      ['FAILED', 'FAILURE', 'USER_DROPPED', 'VOID'].includes(statusUpper(p.payment_status))
    );

    if (hasFailed) {
      booking.paymentStatus = 'Failed';
      booking.bookingStatus = 'Cancelled';
      await booking.save();
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    return res.status(400).json({
      message:
        'Payment not completed yet. If you finished paying, wait a few seconds and refresh; otherwise complete payment from My Bookings.',
    });
  } catch (error) {
    console.error('Cashfree verify error:', error.response?.data || error.message);
    const msg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message;
    return res.status(500).json({ message: msg || 'Payment verification error' });
  }
};

module.exports = { createOrder, verifyPayment };
