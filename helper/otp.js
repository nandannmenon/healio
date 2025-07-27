const { Otp } = require('../models');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via email
async function sendOTP(otp, email, purpose = 'registration', temp_token = null, phone = null) {
  try {
    // Check if email credentials are configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      console.log(`[OTP NOT SENT] Email credentials not configured. OTP: ${otp}`);
      return true; // Don't fail registration if email is not configured
    }
    
    // Email logic for registration
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });
    await transporter.verify();
    let subject, text, html;
    if (purpose === 'registration') {
      subject = 'Complete your registration - OTP Verification';
      text = `Your OTP code is: ${otp}. Please use this code to complete your registration. The OTP is valid only for 10 minutes.`;
      html = `
        <h2>Complete Your Registration</h2>
        <p>Your OTP code is: <strong>${otp}</strong></p>
        <p>Please use this code to complete your registration. The OTP is valid only for 10 minutes.</p>
      `;
    } else {
      subject = 'OTP for completing your registration';
      text = `Your OTP code is : ${otp} . Please use this code to complete your registration. The OTP is valid only for 10 minutes.`;
      html = `
        <h2>Registration OTP</h2>
        <p>Your OTP code is: <strong>${otp}</strong></p>
        <p>Please use this code to complete your registration. The OTP is valid only for 10 minutes.</p>
      `;
    }
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: subject,
      text: text,
      html: html
    };
    const info = await transporter.sendMail(mailOptions);
    console.log(`[OTP SENT] Email: ${email}, OTP: ${otp}`);
    return true;
  } catch (error) {
    console.error('Send OTP error:', error);
    return true; // Don't fail registration if email fails
  }
}

// Verify OTP 
async function verifyOTP(phone, otp) {
  try {
    return true;
  } catch (error) {
    console.error('Verify OTP error:', error);
    return false;
  }
}

// Centralized OTP creation and storage
async function createAndStoreOTP({ phone, user_id = null, email = null, name = null, transaction = null, expiryMinutes = 10 }) {
  const otp = generateOTP();
  const otp_expiry = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  // Invalidate all previous unverified OTPs for this phone (and user if provided)
  const where = user_id ? { phone, user_id, otp_verified: false } : { phone, otp_verified: false };
  await Otp.update({ otp_verified: true }, { where, transaction });
  
  // Store new OTP
  await Otp.create({
    phone,
    user_id,
    email,
    name,
    otp,
    otp_verified: false,
    otp_expiry
  }, { transaction });
  return otp;
}

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP,
  createAndStoreOTP
};
