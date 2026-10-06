// Cuenta creada al comprar o solicitar un plan sin tener cuenta: se le manda un
// código de 6 dígitos para que cree su contraseña con el mismo flujo de
// "olvidé mi contraseña" (send-otp / verify-otp / reset-password).
const nodemailer = require('nodemailer');
const User = require('../models/user.js');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendPasswordSetupCode({ id, email, name, trainerLabel }) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await User.updateOtp(id, otp);
    await transporter.sendMail({
        from: `"Trainer Partners" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Crea tu contraseña en Trainer Partners',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #000; text-align: center;">Bienvenido${name ? `, ${name}` : ''}</h2>
                <p style="color: #555; font-size: 16px;">${trainerLabel || 'Tu entrenador'} te registró en Trainer Partners. Para entrar a la app, crea tu contraseña con este código:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="display: inline-block; background-color: #000; color: #fff; font-size: 24px; font-weight: bold; padding: 15px 30px; letter-spacing: 5px; border-radius: 5px;">${otp}</span>
                </div>
                <p style="color: #555; font-size: 14px;">En la app toca <b>Olvidé mi contraseña</b>, ingresa este código y elige tu contraseña. Si no esperabas este correo, ignóralo.</p>
            </div>
        `
    });
}

module.exports = { sendPasswordSetupCode };
