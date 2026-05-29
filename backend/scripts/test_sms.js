const db = require('../src/models/db');
const sms = require('../src/controllers/smsController');

const phone = process.argv[2] || '0241234567';

(async ()=>{
  try {
    console.log('Initializing DB schema...');
    await db.initSchema();
    console.log('Generating code for', phone);
    const gen = await sms.generateAndSendCode(phone, 'verification');
    console.log('generateAndSendCode result:', gen);
    if (gen.code) {
      console.log('Attempting to verify with code:', gen.code);
      const v = await sms.verifyCodeInternal(phone, gen.code, 'verification');
      console.log('verifyCodeInternal result:', v);
    } else {
      console.log('No code returned (likely sent via provider).');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error during test:', err);
    process.exit(1);
  }
})();