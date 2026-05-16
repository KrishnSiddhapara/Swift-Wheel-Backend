const { Cashfree, CFEnvironment } = require('cashfree-pg');
require('dotenv').config();

console.log('App ID:', process.env.CASHFREE_APP_ID ? process.env.CASHFREE_APP_ID.substring(0, 4) + '...' : 'undefined');
console.log('Secret Key:', process.env.CASHFREE_SECRET_KEY ? process.env.CASHFREE_SECRET_KEY.substring(0, 4) + '...' : 'undefined');

Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = CFEnvironment.SANDBOX;

const cashfree = new Cashfree();

async function verify() {
    console.log('Attempting to create a test order...');
    const request = {
        order_amount: 1.00,
        order_currency: "INR",
        order_id: `test_${Date.now()}`,
        customer_details: {
            customer_id: "test_user_123",
            customer_phone: "9999999999",
            customer_name: "Test User"
        }
    };

    try {
        const response = await cashfree.PGCreateOrder(request);
        console.log('Order created successfully:', response.data.order_id);
        console.log('Payment Session ID:', response.data.payment_session_id);
    } catch (error) {
        if (error.response) {
            console.log('API Error:', error.response.data.message);
        } else {
            console.log('Verification failed with error:', error.message);
        }
    }
}

verify();
