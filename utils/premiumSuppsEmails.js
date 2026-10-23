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
// Logo real de la tienda (company.logo, id=4) — ya viene con fondo
// transparente pensado para ir sobre fondo oscuro, igual que el header
// del correo.
const COMPANY_LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/premium-delivery-app.appspot.com/o/FONDO%20TRANSPARENTE%201%20%2Blema.png?alt=media&token=8f0fb66f-bca0-40ef-b6d0-796ea0776b68';

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

// Gmail (iOS/Android) "ayuda" auto-invirtiendo colores de correos que no
// declaran explícitamente soporte de modo oscuro: convierte fondos
// oscuros en claros y texto claro en oscuro, color por color, SALVO que
// detecte un bloque @media (prefers-color-scheme: dark) real en el
// <head> — eso es lo único que le dice "este correo ya está diseñado a
// propósito, no lo toques". Por eso cada color va DOS veces: como
// estilo inline/bgcolor normal (para Outlook/clientes viejos) y otra vez
// aquí con las mismas clases repetidas en claro y oscuro con !important
// (para que Gmail nunca tenga motivo para re-colorear nada).
function darkModeProofStyles() {
    return `
    <style>
      .pss-bg, .pss-surface, .pss-surface-soft, .pss-ink, .pss-ink-muted, .pss-white { }
      @media (prefers-color-scheme: light), (prefers-color-scheme: dark) {
        .pss-bg { background-color: ${COLOR_BG} !important; }
        .pss-surface { background-color: ${COLOR_SURFACE} !important; }
        .pss-surface-soft { background-color: ${COLOR_SURFACE_SOFT} !important; }
        .pss-ink { color: ${COLOR_INK} !important; }
        .pss-ink-muted { color: ${COLOR_INK_MUTED} !important; }
        .pss-white { color: #ffffff !important; }
      }
    </style>`;
}

// Nota: si solo se manda un <div> suelto como html del correo, Gmail (y
// la mayoría de clientes) lo envuelven en SU PROPIO <body> blanco por
// defecto, y ese blanco se asoma alrededor de la tarjeta sin importar
// qué background-color le pongamos al div. La única forma confiable de
// que el fondo oscuro cubra TODO el correo es mandar un documento html
// completo, con el fondo puesto tanto por CSS inline como por el
// atributo bgcolor (clientes viejos ignoran CSS pero sí respetan
// bgcolor) en <body> y en la tabla que envuelve todo.
function emailShell({ title, subtitle, bodyHtml }) {
    return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    ${darkModeProofStyles()}
  </head>
  <body bgcolor="${COLOR_BG}" class="pss-bg" style="margin:0;padding:0;background-color:${COLOR_BG};font-family:'Inter',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLOR_BG}" class="pss-bg" style="background-color:${COLOR_BG};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLOR_SURFACE}" class="pss-surface" style="max-width:480px;background-color:${COLOR_SURFACE};border-radius:20px;border:1px solid ${COLOR_BORDER};overflow:hidden;">
            <tr>
              <td bgcolor="${COLOR_RED}" style="background:${GRADIENT_BRAND};background-color:${COLOR_RED};padding:28px 32px;text-align:center;">
                <img src="${COMPANY_LOGO_URL}" alt="${STORE_NAME}" width="140" style="max-width:140px;width:140px;height:auto;display:block;margin:0 auto 14px;" />
                <h1 class="pss-white" style="margin:6px 0 0;color:#ffffff;font-size:21px;font-weight:800;line-height:1.3;">${title}</h1>
                ${subtitle ? `<p class="pss-white" style="margin:8px 0 0;color:#ffffff;font-size:13px;">${subtitle}</p>` : ''}
              </td>
            </tr>
            <tr>
              <td bgcolor="${COLOR_SURFACE}" class="pss-surface pss-ink" style="background-color:${COLOR_SURFACE};padding:28px 28px 8px;color:${COLOR_INK};font-size:14px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td bgcolor="${COLOR_SURFACE}" class="pss-surface" style="background-color:${COLOR_SURFACE};padding:20px 28px;text-align:center;border-top:1px solid ${COLOR_BORDER};">
                <p class="pss-ink-muted" style="margin:0;font-size:11px;color:${COLOR_INK_MUTED};">Powered by <span class="pss-ink" style="color:${COLOR_INK};font-weight:700;">COBI</span></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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
            <p class="pss-ink" style="margin:0;font-size:13px;font-weight:700;color:${COLOR_INK};">${p.name}</p>
            <p class="pss-ink-muted" style="margin:2px 0 0;font-size:12px;color:${COLOR_INK_MUTED};">x${p.quantity}</p>
          </td>
          <td class="pss-ink" style="padding:10px 0;border-bottom:1px solid ${COLOR_BORDER};text-align:right;font-size:13px;font-weight:700;color:${COLOR_INK};white-space:nowrap;">
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
        <p class="pss-ink" style="margin:0 0 4px;color:${COLOR_INK};">¡Hola ${greetName}! Tu pago se confirmó correctamente y ya estamos preparando tu pedido.</p>
        <table role="presentation" width="100%" bgcolor="${COLOR_SURFACE_SOFT}" class="pss-surface-soft" style="width:100%;background-color:${COLOR_SURFACE_SOFT};border-radius:12px;margin:18px 0;">
          <tr><td bgcolor="${COLOR_SURFACE_SOFT}" class="pss-surface-soft" style="background-color:${COLOR_SURFACE_SOFT};padding:14px 18px;">
            <p class="pss-ink-muted" style="margin:0 0 3px;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:${COLOR_INK_MUTED};font-weight:700;">Folio</p>
            <p class="pss-ink" style="margin:0 0 10px;font-size:15px;font-weight:800;color:${COLOR_INK};">PSS-${order.id}</p>
            <p class="pss-ink-muted" style="margin:0 0 3px;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:${COLOR_INK_MUTED};font-weight:700;">Entrega programada</p>
            <p class="pss-ink" style="margin:0 0 10px;font-size:14px;font-weight:600;color:${COLOR_INK};">${order.hour_program || 'Por confirmar'}</p>
            <p class="pss-ink-muted" style="margin:0 0 3px;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:${COLOR_INK_MUTED};font-weight:700;">Dirección</p>
            <p class="pss-ink" style="margin:0;font-size:14px;font-weight:600;color:${COLOR_INK};">${order.address?.address || ''}, ${order.address?.neighborhood || ''}</p>
          </td></tr>
        </table>
        <p class="pss-ink-muted" style="margin:0 0 4px;font-size:12px;font-weight:700;color:${COLOR_INK_MUTED};text-transform:uppercase;letter-spacing:0.04em;">Tu ticket</p>
        ${productsTableHtml(order.products)}
        <table role="presentation" style="width:100%;margin-top:4px;">
          <tr>
            <td class="pss-ink" style="font-size:15px;font-weight:800;color:${COLOR_INK};padding-top:10px;">Total</td>
            <td class="pss-ink" style="font-size:17px;font-weight:800;color:${COLOR_INK};text-align:right;padding-top:10px;">${money(order.total)}</td>
          </tr>
        </table>
        <p class="pss-ink-muted" style="margin:22px 0 0;font-size:12px;color:${COLOR_INK_MUTED};">Te avisaremos por aquí cuando tu pedido esté en camino.</p>`;

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
        <p class="pss-ink" style="margin:0 0 4px;color:${COLOR_INK};">¡Gracias, ${greetName}! Tu pedido <strong>PSS-${order.id}</strong> ya fue entregado. Esperamos que disfrutes tus productos y que te ayuden a llegar a tu siguiente meta 💪</p>
        ${productsTableHtml(order.products)}
        <table role="presentation" style="width:100%;margin-top:4px;">
          <tr>
            <td class="pss-ink" style="font-size:15px;font-weight:800;color:${COLOR_INK};padding-top:10px;">Total</td>
            <td class="pss-ink" style="font-size:17px;font-weight:800;color:${COLOR_INK};text-align:right;padding-top:10px;">${money(order.total)}</td>
          </tr>
        </table>
        <p style="margin:24px 0 0;text-align:center;">
          <a href="https://deliveryserver.herokuapp.com" class="pss-white" style="display:inline-block;background:${COLOR_RED};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 30px;border-radius:999px;">Seguir comprando</a>
        </p>
        <p class="pss-ink-muted" style="margin:20px 0 0;font-size:12px;color:${COLOR_INK_MUTED};text-align:center;">Gracias por confiar en ${STORE_NAME}.</p>`;

    await transporter.sendMail({
        from: FROM_ADDRESS,
        to: order.client.email,
        subject: `¡Tu pedido PSS-${order.id} fue entregado! 🎉`,
        html: emailShell({ title: '¡Gracias por tu compra!', subtitle: `Folio PSS-${order.id} entregado`, bodyHtml })
    });
}

// Correo 3: avisa al DUEÑO (no al cliente) apenas se genera un pedido
// nuevo, para que pueda despacharlo de inmediato — ver
// controllers/ordersController.create. Se manda al crearse la orden, sin
// esperar confirmación de pago (TARJETA puede tardar en confirmar vía
// Clip, pero el dueño igual quiere enterarse ya de que entró un pedido).
const STORE_OWNER_NOTIFICATION_EMAIL = 'oliverjdm22@gmail.com';

const PAYMETHOD_LABELS = { TARJETA: 'Tarjeta (Clip)', EFECTIVO: 'Efectivo', REPS: 'Reps/puntos' };

async function sendNewOrderOwnerNotification(order) {
    const clientName = [order.client?.name, order.client?.lastname].filter(Boolean).join(' ') || 'Cliente';
    const paymentLabel = PAYMETHOD_LABELS[order.paymethod] || order.paymethod || 'N/D';

    const bodyHtml = `
        <p class="pss-ink" style="margin:0 0 4px;color:${COLOR_INK};">Entró un pedido nuevo — folio <strong>PSS-${order.id}</strong>.</p>
        <table role="presentation" width="100%" bgcolor="${COLOR_SURFACE_SOFT}" class="pss-surface-soft" style="width:100%;background-color:${COLOR_SURFACE_SOFT};border-radius:12px;margin:18px 0;">
          <tr><td bgcolor="${COLOR_SURFACE_SOFT}" class="pss-surface-soft" style="background-color:${COLOR_SURFACE_SOFT};padding:14px 18px;">
            <p class="pss-ink-muted" style="margin:0 0 3px;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:${COLOR_INK_MUTED};font-weight:700;">Cliente</p>
            <p class="pss-ink" style="margin:0 0 10px;font-size:15px;font-weight:800;color:${COLOR_INK};">${clientName}${order.client?.phone ? ` · ${order.client.phone}` : ''}</p>
            <p class="pss-ink-muted" style="margin:0 0 3px;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:${COLOR_INK_MUTED};font-weight:700;">Estado / Pago</p>
            <p class="pss-ink" style="margin:0 0 10px;font-size:14px;font-weight:600;color:${COLOR_INK};">${order.status} · ${paymentLabel}</p>
            <p class="pss-ink-muted" style="margin:0 0 3px;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:${COLOR_INK_MUTED};font-weight:700;">Entrega programada</p>
            <p class="pss-ink" style="margin:0 0 10px;font-size:14px;font-weight:600;color:${COLOR_INK};">${order.hour_program || 'Por confirmar'}</p>
            <p class="pss-ink-muted" style="margin:0 0 3px;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:${COLOR_INK_MUTED};font-weight:700;">Dirección</p>
            <p class="pss-ink" style="margin:0;font-size:14px;font-weight:600;color:${COLOR_INK};">${order.address?.address || ''}, ${order.address?.neighborhood || ''}</p>
            ${order.comments ? `<p class="pss-ink-muted" style="margin:10px 0 3px;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;color:${COLOR_INK_MUTED};font-weight:700;">Notas / sabores</p><p class="pss-ink" style="margin:0;font-size:13px;color:${COLOR_INK};">${order.comments}</p>` : ''}
          </td></tr>
        </table>
        <p class="pss-ink-muted" style="margin:0 0 4px;font-size:12px;font-weight:700;color:${COLOR_INK_MUTED};text-transform:uppercase;letter-spacing:0.04em;">Productos</p>
        ${productsTableHtml(order.products)}
        <table role="presentation" style="width:100%;margin-top:4px;">
          <tr>
            <td class="pss-ink" style="font-size:15px;font-weight:800;color:${COLOR_INK};padding-top:10px;">Total</td>
            <td class="pss-ink" style="font-size:17px;font-weight:800;color:${COLOR_INK};text-align:right;padding-top:10px;">${money(order.total)}</td>
          </tr>
        </table>`;

    await transporter.sendMail({
        from: FROM_ADDRESS,
        to: STORE_OWNER_NOTIFICATION_EMAIL,
        subject: `🔔 Nuevo pedido PSS-${order.id} — ${paymentLabel}`,
        html: emailShell({ title: '¡Nuevo pedido!', subtitle: `Folio PSS-${order.id}`, bodyHtml })
    });
}

module.exports = { sendOrderConfirmationEmail, sendOrderDeliveredEmail, sendNewOrderOwnerNotification };
