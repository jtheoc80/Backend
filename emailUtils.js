import nodemailer from 'nodemailer';
import logger from './logger.js';

async function sendEmail(to, subject, text) {
    try {
        let transporter = nodemailer.createTransporter({
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

        logger.info('Email sent successfully', {
            to,
            subject,
            messageId: info.messageId
        });
        
        return info;
    } catch (error) {
        logger.error('Failed to send email', {
            to,
            subject,
            error: {
                message: error.message,
                stack: error.stack
            }
        });
        throw error;
    }
}

export { sendEmail };