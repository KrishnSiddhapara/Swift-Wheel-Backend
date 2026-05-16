const { Cashfree, CFEnvironment } = require('cashfree-pg');
require('dotenv').config();

Cashfree.XClientId = process.env.CASHFREE_APP_ID || "dummy";
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY || "dummy";
Cashfree.XEnvironment = CFEnvironment.SANDBOX;

const cf = new Cashfree();

// Request body
const request = {
    order_amount: 1.00,
    order_currency: "INR",
    customer_details: {
        customer_id: "test_user_123",
        customer_phone: "9999999999"
    }
};

async function test() {
    console.log('Testing with 1 argument...');
    try {
        // Just curious if it works with 1 arg
        // await cf.PGCreateOrder(request); 
        console.log('Function length:', cf.PGCreateOrder.length);
    } catch (e) {
        console.log('Error 1 arg:', e.message);
    }
}

test();
