const { Cashfree, CFEnvironment } = require('cashfree-pg');
require('dotenv').config();

// Attempt 1: Static assignment (current)
Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = CFEnvironment.SANDBOX;

const cf1 = new Cashfree();

console.log("CF1 config:", cf1.XClientId, cf1.XClientSecret, cf1.XEnvironment);

// Attempt 2: Constructor
/*
const cf2 = new Cashfree(
    CFEnvironment.SANDBOX,
    process.env.CASHFREE_APP_ID,
    process.env.CASHFREE_SECRET_KEY
);
console.log("CF2 config:", cf2.XClientId, cf2.XClientSecret, cf2.XEnvironment);
*/

