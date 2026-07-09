const mongoose = require('mongoose');
const { connectDB } = require('./config/database/connection');
const User = require('./models/User');
const EmailOtp = require('./models/EmailOtp');

async function run() {
  await connectDB();
  try {
    const otps = await EmailOtp.find({}).sort({ createdAt: -1 }).limit(5);
    console.log('--- LATEST 5 OTPS IN DB ---');
    otps.forEach(o => {
      console.log(`Email: ${o.email}, OTP: ${o.otp}, Purpose: ${o.purpose}, Verified: ${o.verified}, Expires: ${o.expiresAt}, Created: ${o.createdAt}`);
    });

    const users = await User.find({}).sort({ createdAt: -1 }).limit(5);
    console.log('\n--- LATEST 5 USERS IN DB ---');
    users.forEach(u => {
      console.log(`Email: ${u.email}, Status: ${u.status}, Verified: ${u.emailVerified}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
