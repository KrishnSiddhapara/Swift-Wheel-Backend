const https = require('https');
const dotenv = require('dotenv');

dotenv.config();

const data = JSON.stringify({
    order_amount: 1.00,
    order_currency: "INR",
    customer_details: {
        customer_id: "test_user_unique",
        customer_phone: "9999999999"
    }
});

const options = {
    hostname: 'sandbox.cashfree.com',
    port: 443,
    path: '/pg/orders',
    method: 'POST',
    headers: {
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log('STATUS:', res.statusCode);
    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('end', () => {
        console.log('BODY:', body);
    });
});

req.on('error', (e) => {
    console.error('ERROR:', e);
});

req.write(data);
req.end();
