import nodemailer from 'nodemailer';
import config from './config.js';

async function sendEmail(to, subject, text) {
    let transporter = nodemailer.createTransporter({
        service: 'Gmail', // or another service like 'Yahoo', 'Outlook'
        auth: {
            user: config.email.user, // your email
            pass: config.email.pass, // your email password
        },
    });

    let info = await transporter.sendMail({
        from: config.email.user,
        to: to,
        subject: subject,
        text: text,
    });

    console.log('Message sent: %s', info.messageId);
}

export { sendEmail };