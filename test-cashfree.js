const { Cashfree, CFEnvironment } = require('cashfree-pg');
const dotenv = require('dotenv');

dotenv.config();

Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = CFEnvironment.SANDBOX;
Cashfree.XApiVersion = "2023-08-01";

const cashfree = new Cashfree();

const test = async () => {
  try {
    console.log("Testing Cashfree with Client ID:", Cashfree.XClientId.substring(0, 10) + "...");
    const request = {
      order_amount: 1.00,
      order_currency: "INR",
      order_id: "test_" + Date.now(),
      customer_details: {
        customer_id: "test_user_1",
        customer_phone: "9999999999",
        customer_name: "Test User"
      }
    };
    const response = await cashfree.PGCreateOrder(request);
    console.log("SUCCESS! Order created:", response.data.order_id);
  } catch (error) {
    console.error("FAILURE! Status Code:", error.response ? error.response.status : "No response");
    console.error("Error Data:", error.response ? error.response.data : error.message);
  }
};

test();
