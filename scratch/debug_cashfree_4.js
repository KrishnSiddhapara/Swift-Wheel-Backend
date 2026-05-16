const { Cashfree, CFEnvironment } = require('cashfree-pg');
require('dotenv').config();

Cashfree.XClientId = process.env.CASHFREE_APP_ID || "dummy";
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY || "dummy";
Cashfree.XEnvironment = CFEnvironment.SANDBOX;

const cf = new Cashfree();
console.log('cf.PGCreateOrder type:', typeof cf.PGCreateOrder);
console.log('Cashfree.PGCreateOrder type:', typeof Cashfree.PGCreateOrder);
