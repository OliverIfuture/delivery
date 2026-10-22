// utils/premiumSuppsEmails.js
// Correos reales de Premium Supplements (id_order_company = 4) — mismo
// nodemailer/Gmail ya configurado en el resto del backend (EMAIL_USER/
// EMAIL_PASS), con el tema oscuro real de la app (fondo azul-marino,
// degradado rojo-naranja de marca) en vez del "Google Modern" claro que
// usa trainer-partners — es un negocio/app distinto, con su propia
// identidad. Tabla-based + estilos inline a propósito: así es como ya
// funciona el correo de invitación que sí se ve bien en Gmail/Outlook/etc,
// CSS moderno (flex/grid) no es confiable en la mayoría de clientes de correo.
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const STORE_NAME = 'Premium Supplements BC';
const FROM_ADDRESS = `"${STORE_NAME}" <${process.env.EMAIL_USER}>`;

// Paleta real de la app (src/assets/base.css de premium-supps-store).
const COLOR_BG = '#0a0e1c';
const COLOR_SURFACE = '#141a2e';
const COLOR_SURFACE_SOFT = '#1d2540';
const COLOR_BORDER = '#272f4a';
const COLOR_INK = '#f5f6fa';
const COLOR_INK_MUTED = '#94a0bd';
const COLOR_RED = '#ef233c';
const GRADIENT_BRAND = 'linear-gradient(135deg, #ef233c, #f97316)';

function money(value) {
    return `$${Math.round(Number(value)).toLocaleString('es-MX')} MXN`;
}

function emailShell({ title, subtitle, bodyHtml }) {
    return `
    <div style="background-color:${COLOR_BG};padding:32px 16px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:480px;margin:0 auto;background:${COLOR_SURFACE};border-radius:20px;overflow:hidden;border:1px solid ${COLOR_BORDER};">

        <div style="background:${GRADIENT_BRAND};padding:28px 32px;text-align:center;">
          <table role="presentation" style="margin:0 auto 12px;">
            <tr><td style="width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,0.2);color:#fff;text-align:center;vertical-align:middle;font-weight:800;font-size:18px;">P</td></tr>
          </table>
          <p style="margin:0;color:rgba(255,255,255,0.85);font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${STORE_NAME}</p>
          <h1 style="margin:6px 0 0;color:#fff;font-size:21px;font-weight:800;line-height:1.3;">${title}</h1>
          ${subtitle ? `<p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">${subtitle}</p>` : ''}
        </div>

        <div style="padding:28px 28px 8px;color:${COLOR_INK};font-size:14px;line-height:1.6;">
          ${bodyHtml}
        </div>

        <div style="padding:20px 28px;text-align:center;border-top:1px solid ${COLOR_BORDER};margin-top:12px;">
          <p style="margin:0;font-size:11px;color:${COLOR_INK_MUTED};">Powered by <span style="color:${COLOR_INK};font-weight:700;">COBI</span></p>
        </div>
      </div>
    </div>`;
}

function productsTableHtml(products) {
    const rows = products.map((p) => {
        const unitPrice = p.price_special && Number(p.price_special) < Number(p.price) ? p.price_special : p.price;
        const img = p.image1
            ? `<img src="${p.image1}" width="48" height="48" style="border-radius:8px;object-fit:cover;display:block;background:${COLOR_SURFACE_SOFT};" />`
            : `<div style="width:48px;height:48px;border-radius:8px;background:${COLOR_SURFACE_SOFT};"></div>`;
        return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${COLOR_BORDER};width:48px;">${img}</td>
          <td style="padding:10px 0 10px 12px;border-bottom:1px solid ${COLOR_BORDER};">
            <p style="margin:0;font-size:13px;font-weight:700;color:${COLOR_INK};">${p.name}</p>
            <p style="margin:2px 0 0;font-size:12px;color:${COLOR_INK_MUTED};">x${p.quantity}</p>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid ${COLOR_BORDER};text-align:right;font-size:13px;font-weight:700;color:${COLOR_INK};white-space:nowrap;">
            ${money(Number(unitPrice) * p.quantity)}
          </td>
        </tr>`;
    }).join('');

    return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>`;
}

// Correo 1: se manda cuando Clip confirma un pago real (orden pasa a
// PAGADO) — ver controllers/clipController.js.
async function sendOrderConfirmationEmail(order) {
    if (!order.client?.email) return;
    const greetName = order.client.name ? order.client.name.split(' ')[0] : 'cliente';

    const bodyHtml = `
        <p style="margin:0 0 4px;">¡Hola ${greetName}! Tu pago se confirmó correctamente y ya estamos preparando tu pedido.</p>
        <table role="presentation" style="width:100%;background:${COLOR_SURFACE_SOFT};border-radius:12px;margin:18px 0;">
          <tr><td style="padding:14px 18px;">
            <p style="margin:0 0 3px;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:${COLOR_INK_MUTED};font-weight:700;">Folio</p>
            <p style="margin:0 0 10px;font-size:15px;font-weight:800;color:${COLOR_INK};">PSS-${order.id}</p>
            <p style="margin:0 0 3px;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:${COLOR_INK_MUTED};font-weight:700;">Entrega programada</p>
            <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:${COLOR_INK};">${order.hour_program || 'Por confirmar'}</p>
            <p style="margin:0 0 3px;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:${COLOR_INK_MUTED};font-weight:700;">Dirección</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:${COLOR_INK};">${order.address?.address || ''}, ${order.address?.neighborhood || ''}</p>
          </td></tr>
        </table>
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${COLOR_INK_MUTED};text-transform:uppercase;letter-spacing:0.04em;">Tu ticket</p>
        ${productsTableHtml(order.products)}
        <table role="presentation" style="width:100%;margin-top:4px;">
          <tr>
            <td style="font-size:15px;font-weight:800;color:${COLOR_INK};padding-top:10px;">Total</td>
            <td style="font-size:17px;font-weight:800;color:${COLOR_INK};text-align:right;padding-top:10px;">${money(order.total)}</td>
          </tr>
        </table>
        <p style="margin:22px 0 0;font-size:12px;color:${COLOR_INK_MUTED};">Te avisaremos por aquí cuando tu pedido esté en camino.</p>`;

    await transporter.sendMail({
        from: FROM_ADDRESS,
        to: order.client.email,
        subject: `Tu pedido PSS-${order.id} fue confirmado 🧾`,
        html: emailShell({ title: '¡Pedido confirmado!', subtitle: `Folio PSS-${order.id}`, bodyHtml })
    });
}

// Correo 2: se manda cuando un repartidor/admin marca la orden como
// ENTREGADO — ver controllers/ordersController.updateToDelivered.
async function sendOrderDeliveredEmail(order) {
    if (!order.client?.email) return;
    const greetName = order.client.name ? order.client.name.split(' ')[0] : 'cliente';

    const bodyHtml = `
        <p style="margin:0 0 4px;">¡Gracias, ${greetName}! Tu pedido <strong>PSS-${order.id}</strong> ya fue entregado. Esperamos que disfrutes tus productos y que te ayuden a llegar a tu siguiente meta 💪</p>
        ${productsTableHtml(order.products)}
        <table role="presentation" style="width:100%;margin-top:4px;">
          <tr>
            <td style="font-size:15px;font-weight:800;color:${COLOR_INK};padding-top:10px;">Total</td>
            <td style="font-size:17px;font-weight:800;color:${COLOR_INK};text-align:right;padding-top:10px;">${money(order.total)}</td>
          </tr>
        </table>
        <p style="margin:24px 0 0;text-align:center;">
          <a href="https://deliveryserver.herokuapp.com" style="display:inline-block;background:${COLOR_RED};color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 30px;border-radius:999px;">Seguir comprando</a>
        </p>
        <p style="margin:20px 0 0;font-size:12px;color:${COLOR_INK_MUTED};text-align:center;">Gracias por confiar en ${STORE_NAME}.</p>`;

    await transporter.sendMail({
        from: FROM_ADDRESS,
        to: order.client.email,
        subject: `¡Tu pedido PSS-${order.id} fue entregado! 🎉`,
        html: emailShell({ title: '¡Gracias por tu compra!', subtitle: `Folio PSS-${order.id} entregado`, bodyHtml })
    });
}

module.exports = { sendOrderConfirmationEmail, sendOrderDeliveredEmail };
