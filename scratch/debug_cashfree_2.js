const { Cashfree, CFEnvironment } = require('cashfree-pg');
try {
    const cf = new Cashfree({
        xClientId: "dummy",
        xClientSecret: "dummy",
        xEnvironment: CFEnvironment.SANDBOX
    });
    console.log('Instance keys:', Object.keys(cf));
} catch (e) {
    console.log('Error creating instance:', e.message);
}

// Maybe it's not a constructor but has static methods?
console.log('Static methods on Cashfree:', Object.getOwnPropertyNames(Cashfree));
