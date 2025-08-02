
const nodemailer = require('nodemailer');

async function sendEmail(to, subject, text) {
    let transporter = nodemailer.createTransport({
        service: 'Gmail', // or another service like 'Yahoo', 'Outlook'
        auth: {
            user: process.env.EMAIL_USER, // your email
            pass: process.env.EMAIL_PASS, // your email password
        },
    });

    let info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: to,
        subject: subject,
        text: text,
    });

    console.log('Message sent: %s', info.messageId);
}

module.exports = { sendEmail };
