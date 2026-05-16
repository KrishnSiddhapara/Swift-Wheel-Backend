const { Cashfree, CFEnvironment } = require('cashfree-pg');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

const cashfree = new Cashfree();
cashfree.XClientId = process.env.CASHFREE_APP_ID;
cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
cashfree.XEnvironment = CFEnvironment.SANDBOX;
cashfree.XApiVersion = "2023-08-01";

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

    const orderId = `order_${booking._id}_${Date.now()}`;
    const customerPhone = "9999999999"; 

    const request = {
      order_amount: booking.totalAmount,
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: req.user._id.toString(),
        customer_phone: customerPhone,
        customer_name: req.user.name || "Customer"
      },
      order_meta: {
        return_url: `http://localhost:5173/payment-status?order_id={order_id}&booking_id=${booking._id}`
      }
    };

    const response = await cashfree.PGCreateOrder(request);

    // Save orderId to booking
    booking.orderId = orderId;
    await booking.save();

    res.json({
      orderId: response.data.order_id,
      paymentSessionId: response.data.payment_session_id
    });
  } catch (error) {
    console.error("Cashfree Order Creation Error:", error.response ? error.response.data : error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || error.message || 'Error creating Cashfree order' 
    });
  }
};

// @desc    Verify Cashfree Payment
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = async (req, res) => {
  try {
    const { orderId, bookingId } = req.body;

    const response = await cashfree.PGOrderFetchPayments(orderId);
    
    const payments = response.data;
    const successfulPayment = payments.find(payment => payment.payment_status === 'SUCCESS');

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (successfulPayment) {
      booking.paymentStatus = 'Paid';
      booking.bookingStatus = 'Confirmed';
      booking.paymentId = successfulPayment.cf_payment_id.toString();
      await booking.save();

      // Update Vehicle Status
      const Vehicle = require('../models/Vehicle');
      const vehicle = await Vehicle.findById(booking.vehicleId);
      if (vehicle) {
          vehicle.availabilityStatus = 'unavailable';
          vehicle.expectedAvailableAt = booking.endDate;
          await vehicle.save();
          
          const io = req.app.get('io');
          if (io) {
              io.emit('vehicle_availability_updated', {
                  vehicleId: vehicle._id,
                  availabilityStatus: 'unavailable',
                  expectedAvailableAt: booking.endDate
              });
          }
      }

      // Save payment record
      await Payment.create({
        userId: req.user._id,
        bookingId: booking._id,
        amount: booking.totalAmount,
        paymentMethod: successfulPayment.payment_group || 'Cashfree',
        transactionId: successfulPayment.cf_payment_id?.toString(),
        status: 'Completed'
      });

      res.json({ message: 'Payment verified and booking confirmed successfully' });
    } else {
      // Don't cancel booking automatically, let the user retry
      // booking.paymentStatus = 'Failed';
      // await booking.save();
      res.status(400).json({ message: 'Payment verification failed or payment not yet processed' });
    }
  } catch (error) {
    console.error("Cashfree Verification Error:", error.response ? error.response.data : error);
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.message || error.message 
    });
  }
};

module.exports = { createOrder, verifyPayment };
