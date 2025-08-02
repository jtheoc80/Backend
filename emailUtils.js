
import nodemailer from 'nodemailer';
import { config } from './config/index.js';

async function sendEmail(to, subject, text) {
    let transporter = nodemailer.createTransport({
        service: config.email.service,
        auth: {
            user: config.email.user,
            pass: config.email.pass,
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
