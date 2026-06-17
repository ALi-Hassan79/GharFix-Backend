const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOTP = async (email, name, otp) => {
  await transporter.sendMail({
    from: `"GharFix" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your GharFix Verification Code',
    html: `
      <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9f9f7;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="width:48px;height:48px;background:#1c1c1c;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;">
            <span style="color:#c8a96e;font-size:24px;font-weight:700;">G</span>
          </div>
          <h1 style="font-size:24px;margin:16px 0 4px;">GharFix</h1>
        </div>
        <div style="background:#fff;border-radius:12px;padding:28px;text-align:center;">
          <h2 style="margin:0 0 8px;">Hi ${name}! 👋</h2>
          <p style="color:#666;margin:0 0 24px;">Enter this code to verify your email address:</p>
          <div style="background:#f3f4f6;border-radius:12px;padding:24px;margin-bottom:24px;">
            <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#1c1c1c;">${otp}</span>
          </div>
          <p style="color:#999;font-size:13px;margin:0;">This code expires in <b>10 minutes</b>.</p>
          <p style="color:#999;font-size:13px;">If you didn't create a GharFix account, ignore this email.</p>
        </div>
      </div>
    `
  });
};

module.exports = { sendOTP };