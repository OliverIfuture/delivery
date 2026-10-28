// NUEVO — comprobante de pago por correo, para cuando un cliente le paga
// a su entrenador (pago único o domiciliado). Mismo transporter/credenciales
// que utils/passwordSetup.js (ya configurado y probado en producción), y el
// mismo estilo visual base — tarjeta centrada de 600px con borde redondeado
// — pero con el logo y nombre REALES del entrenador arriba (sacados de
// CobiCheckout.getTrainerBranding, la misma fuente que ya usa la página de
// pago pública), y una barra de color de acento para distinguir de qué
// entrenador viene.
const nodemailer = require('nodemailer');
const CobiCheckout = require('../models/cobiCheckout.js');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

function formatCurrency(amount, currency) {
    const n = Number(amount) || 0;
    return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${String(currency || 'MXN').toUpperCase()}`;
}

function formatDate(date) {
    const d = date ? new Date(date) : new Date();
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * @param {Object} p
 * @param {string} p.to - correo del cliente
 * @param {string} p.clientName
 * @param {number|string} p.trainerUserId - users.id del entrenador (para sacar su branding real)
 * @param {string} p.planName
 * @param {number} p.amount - en unidades reales (no centavos)
 * @param {string} [p.currency]
 * @param {string} [p.paymentMethod] - ej. "Tarjeta", "Domiciliado"
 * @param {string|Date} [p.paymentDate]
 * @param {string} [p.reference] - id de Stripe (PaymentIntent/Invoice) como folio
 */
async function sendPaymentReceipt({ to, clientName, trainerUserId, planName, amount, currency, paymentMethod, paymentDate, reference }) {
    if (!to) return;

    let branding = null;
    try {
        branding = trainerUserId ? await CobiCheckout.getTrainerBranding(trainerUserId) : null;
    } catch (e) {
        console.log(`No se pudo obtener el branding del entrenador ${trainerUserId} para el recibo: ${e.message}`);
    }

    const trainerDisplayName = branding
        ? (branding.company_name || [branding.name, branding.lastname].filter(Boolean).join(' ').trim() || 'Tu entrenador')
        : 'Tu entrenador';
    const logoUrl = branding?.company_logo || null;

    const logoHtml = logoUrl
        ? `<img src="${logoUrl}" alt="${trainerDisplayName}" style="width:56px;height:56px;object-fit:cover;border-radius:12px;background:#fff;" />`
        : `<div style="width:56px;height:56px;border-radius:12px;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-weight:bold;font-size:20px;">${trainerDisplayName.charAt(0).toUpperCase()}</div>`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
            <div style="background:#000; padding: 4px;"></div>
            <div style="padding: 24px 24px 0 24px; display:flex; align-items:center; gap:14px;">
                ${logoHtml}
                <div>
                    <div style="font-size:12px; color:#888; text-transform:uppercase; letter-spacing:0.5px;">Recibo de pago</div>
                    <div style="font-size:18px; font-weight:bold; color:#111;">${trainerDisplayName}</div>
                </div>
            </div>
            <div style="padding: 24px;">
                <h2 style="color: #000; margin: 0 0 6px 0;">¡Gracias por tu pago${clientName ? `, ${clientName}` : ''}!</h2>
                <p style="color: #555; font-size: 14px; margin: 0 0 20px 0;">Este es el comprobante de tu pago a ${trainerDisplayName} a través de Trainer Partners.</p>

                <table style="width:100%; border-collapse: collapse; font-size: 14px;">
                    <tr>
                        <td style="padding: 10px 0; border-top: 1px solid #eee; color:#888;">Plan</td>
                        <td style="padding: 10px 0; border-top: 1px solid #eee; color:#111; text-align:right; font-weight:bold;">${planName || 'Plan'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-top: 1px solid #eee; color:#888;">Total pagado</td>
                        <td style="padding: 10px 0; border-top: 1px solid #eee; color:#111; text-align:right; font-weight:bold;">${formatCurrency(amount, currency)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-top: 1px solid #eee; color:#888;">Método de pago</td>
                        <td style="padding: 10px 0; border-top: 1px solid #eee; color:#111; text-align:right;">${paymentMethod || 'Tarjeta'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-top: 1px solid #eee; color:#888;">Fecha</td>
                        <td style="padding: 10px 0; border-top: 1px solid #eee; color:#111; text-align:right;">${formatDate(paymentDate)}</td>
                    </tr>
                    ${reference ? `
                    <tr>
                        <td style="padding: 10px 0; border-top: 1px solid #eee; color:#888;">Folio</td>
                        <td style="padding: 10px 0; border-top: 1px solid #eee; color:#111; text-align:right; font-family: monospace; font-size: 12px;">${reference}</td>
                    </tr>` : ''}
                </table>

                <p style="color: #999; font-size: 12px; margin-top: 24px;">Si no reconoces este cargo, contacta directamente a ${trainerDisplayName}.</p>
            </div>
            <div style="background:#fafafa; padding: 14px 24px; text-align:center; font-size: 11px; color: #aaa; border-top: 1px solid #eee;">
                Procesado de forma segura vía Trainer Partners · COBI Payments
            </div>
        </div>
    `;

    await transporter.sendMail({
        from: `"${trainerDisplayName} · Trainer Partners" <${process.env.EMAIL_USER}>`,
        to,
        subject: `Recibo de pago · ${planName || 'Tu plan'} · ${formatCurrency(amount, currency)}`,
        html
    });
}

module.exports = { sendPaymentReceipt };
