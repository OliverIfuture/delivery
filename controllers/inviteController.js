// controllers/inviteController.js
//
// NUEVO — flujo real de invitación de cliente (reemplaza el enlace falso
// del frontend y el correo viejo de sendInvitation, sin tocar ninguna
// función existente: sendInvitation/inviteClient se quedan intactas y
// simplemente dejan de usarse desde el frontend).
//
// Tres piezas:
//   1. GET  /api/invite/link            (auth, entrenador) — su enlace real
//   2. POST /api/invite/send            (auth, entrenador) — invita a un email
//   3. GET  /api/invite/resolve/:token  (público) — datos para personalizar
//   4. POST /api/invite/accept          (público) — el cliente acepta
//
// Al aceptar: si el correo YA tiene cuenta y no tiene entrenador asignado,
// solo se actualiza su id_entrenador (sin crear nada nuevo). Si no tiene
// cuenta, se crea con User.create (mismo camino real que ya usa
// registerWithImage para clientes "no-company"), con una contraseña
// generada que se le manda por correo para que no se le olvide.
const User = require('../models/user.js');
const Rol = require('../models/rol.js');
const Invite = require('../models/invite.js');
const ClientSubscription = require('../models/clientSubscription.js');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const CLIENT_BASE_URL = process.env.CLIENT_INVITE_BASE_URL || 'https://thetrainer-app.site/newdash/unirme';
const APP_STORE_URL = 'https://testflight.apple.com/join/1TYBARXK';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.premiumsupplementsversion2023.app';
const DEFAULT_BRAND_COLOR = '#4F46E5';

function generatePassword() {
    // 10 caracteres alfanuméricos, fáciles de leer/transcribir desde un correo.
    return crypto.randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
}

function brandColorOf(row) {
    return (row && row.brand_color) || DEFAULT_BRAND_COLOR;
}

function trainerDisplayName(row) {
    if (!row) return 'Tu entrenador';
    if (row.company_name && row.company_name.trim()) return row.company_name.trim();
    const full = [row.trainer_name, row.trainer_lastname].filter(Boolean).join(' ').trim();
    return full || 'Tu entrenador';
}

function initialsOf(name) {
    return (name || 'T').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// --- Plantilla base "Google Modern" compartida por ambos correos ---
function emailShell({ brandColor, logo, trainerLabel, title, bodyHtml }) {
    const badge = logo
        ? `<img src="${logo}" alt="${trainerLabel}" width="56" height="56" style="border-radius:50%;object-fit:cover;display:block;" />`
        : `<div style="width:56px;height:56px;border-radius:50%;background:${brandColor};color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',Roboto,Arial,sans-serif;font-weight:700;font-size:20px;">${initialsOf(trainerLabel)}</div>`;

    return `
    <div style="background-color:#F1F3F4;padding:32px 16px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 1px 3px rgba(60,64,67,0.15),0 4px 20px rgba(60,64,67,0.1);">
        <div style="padding:32px 32px 0 32px;text-align:center;">
          <table role="presentation" style="margin:0 auto;">
            <tr><td>${badge}</td></tr>
          </table>
          <h1 style="margin:20px 0 6px;font-size:20px;line-height:1.35;color:#202124;font-weight:600;">${title}</h1>
        </div>
        <div style="padding:8px 32px 32px 32px;color:#3c4043;font-size:15px;line-height:1.6;text-align:center;">
          ${bodyHtml}
        </div>
        <div style="background:#F8F9FA;padding:20px 32px;text-align:center;border-top:1px solid #E8EAED;">
          <p style="margin:0;font-size:12px;color:#80868B;">Enviado por ${trainerLabel} a través de Trainer Partners.</p>
        </div>
      </div>
    </div>`;
}

function storeButtonsHtml() {
    return `
      <table role="presentation" style="margin:24px auto 0;">
        <tr>
          <td style="padding:0 6px;">
            <a href="${APP_STORE_URL}" style="display:inline-block;background:#202124;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:10px;">📱 App Store</a>
          </td>
          <td style="padding:0 6px;">
            <a href="${PLAY_STORE_URL}" style="display:inline-block;background:#202124;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:10px;">▶ Google Play</a>
          </td>
        </tr>
      </table>`;
}

async function sendInviteLinkEmail({ to, clientName, trainerLabel, link, brandColor, logo }) {
    const greetName = clientName ? clientName.split(' ')[0] : 'ahí';
    const bodyHtml = `
        <p style="margin:0 0 20px;">¡Hola ${greetName}! <strong>${trainerLabel}</strong> te invitó a entrenar con su equipo. Acepta la invitación para conectar tu cuenta y empezar a recibir tus rutinas.</p>
        <a href="${link}" style="display:inline-block;background:${brandColor};color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,0.15);">Aceptar invitación</a>
        <p style="margin:22px 0 0;font-size:12px;color:#80868B;word-break:break-all;">O copia y pega este enlace:<br><a href="${link}" style="color:${brandColor};">${link}</a></p>`;

    await transporter.sendMail({
        from: `"${trainerLabel}" <${process.env.EMAIL_USER}>`,
        to,
        subject: `${trainerLabel} te invitó a entrenar 💪`,
        html: emailShell({ brandColor, logo, trainerLabel, title: `${trainerLabel} te invitó a su equipo`, bodyHtml })
    });
}

async function sendWelcomeCredentialsEmail({ to, clientName, trainerLabel, password, brandColor, logo }) {
    const greetName = clientName ? clientName.split(' ')[0] : 'campeón';
    const bodyHtml = `
        <p style="margin:0 0 20px;">¡Bienvenido, ${greetName}! Tu cuenta ya está lista y conectada con <strong>${trainerLabel}</strong>. Guarda estos datos para iniciar sesión en la app:</p>
        <table role="presentation" style="width:100%;background:#F8F9FA;border-radius:14px;margin:0 0 22px;">
          <tr>
            <td style="padding:16px 20px;text-align:left;">
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.04em;text-transform:uppercase;color:#80868B;font-weight:700;">Correo</p>
              <p style="margin:0 0 14px;font-size:15px;color:#202124;font-weight:600;">${to}</p>
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.04em;text-transform:uppercase;color:#80868B;font-weight:700;">Contraseña</p>
              <p style="margin:0;font-size:15px;color:#202124;font-weight:600;letter-spacing:0.03em;">${password}</p>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 4px;color:#3c4043;">Descarga la app para entrar:</p>
        ${storeButtonsHtml()}
        <p style="margin:22px 0 0;font-size:12px;color:#80868B;">Puedes cambiar tu contraseña dentro de la app en cualquier momento.</p>`;

    await transporter.sendMail({
        from: `"${trainerLabel}" <${process.env.EMAIL_USER}>`,
        to,
        subject: `¡Ya eres parte del equipo de ${trainerLabel}! 🎉`,
        html: emailShell({ brandColor, logo, trainerLabel, title: '¡Tu cuenta está lista!', bodyHtml })
    });
}

module.exports = {

    async getMyInviteLink(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) {
                return res.status(400).json({ success: false, message: 'Tu usuario no tiene una compañía asociada.' });
            }
            const token = await Invite.getOrCreateCompanyToken(id_company);
            if (!token) {
                return res.status(404).json({ success: false, message: 'No se encontró tu compañía.' });
            }
            return res.status(200).json({ success: true, data: { token, url: `${CLIENT_BASE_URL}/${token}` } });
        } catch (error) {
            console.error('Error en inviteController.getMyInviteLink:', error);
            return res.status(501).json({ success: false, message: 'Error al obtener tu enlace de invitación.' });
        }
    },

    async resolveInvite(req, res) {
        try {
            const { token } = req.params;
            const row = await Invite.resolveCompanyByToken(token);
            if (!row) {
                return res.status(404).json({ success: false, message: 'Este enlace de invitación no es válido.' });
            }
            return res.status(200).json({
                success: true,
                data: {
                    trainerName: trainerDisplayName(row),
                    companyLogo: row.company_logo || null,
                    brandColor: brandColorOf(row)
                }
            });
        } catch (error) {
            console.error('Error en inviteController.resolveInvite:', error);
            return res.status(501).json({ success: false, message: 'Error al resolver el enlace de invitación.' });
        }
    },

    async sendClientInvite(req, res) {
        try {
            const id_company = req.user.mi_store;
            const { email, name } = req.body;

            if (!email || !id_company) {
                return res.status(400).json({ success: false, message: 'Falta el correo del cliente.' });
            }

            const existingUser = await User.findByEmail(email);
            if (existingUser && existingUser.id_entrenador) {
                return res.status(409).json({ success: false, message: 'Este usuario ya está asignado a un entrenador.' });
            }

            const alreadyPending = await Invite.findPendingByEmailAndCompany(email, id_company);
            if (alreadyPending) {
                return res.status(409).json({ success: false, message: 'Ya le enviaste una invitación a este correo.' });
            }

            await Invite.createPendingEmailInvite(id_company, email, name);

            const token = await Invite.getOrCreateCompanyToken(id_company);
            const companyRow = await Invite.resolveCompanyByToken(token);
            const trainerLabel = trainerDisplayName(companyRow);
            const brandColor = brandColorOf(companyRow);
            const link = `${CLIENT_BASE_URL}/${token}`;

            await sendInviteLinkEmail({
                to: email,
                clientName: name,
                trainerLabel,
                link,
                brandColor,
                logo: companyRow ? companyRow.company_logo : null
            });

            return res.status(201).json({ success: true, message: `Invitación enviada a ${email}.` });
        } catch (error) {
            console.error('Error en inviteController.sendClientInvite:', error);
            if (error.code === '23505') {
                return res.status(409).json({ success: false, message: 'Ya existe una invitación pendiente para este correo.' });
            }
            return res.status(501).json({ success: false, message: 'Error al enviar la invitación.' });
        }
    },

    async acceptInvite(req, res) {
        try {
            const { token, email, name, lastname } = req.body;
            if (!token || !email) {
                return res.status(400).json({ success: false, message: 'Faltan datos para aceptar la invitación.' });
            }

            const companyRow = await Invite.resolveCompanyByToken(token);
            if (!companyRow) {
                return res.status(404).json({ success: false, message: 'Este enlace de invitación no es válido.' });
            }
            const id_company = companyRow.id_company;
            const trainerLabel = trainerDisplayName(companyRow);
            const brandColor = brandColorOf(companyRow);

            const existingUser = await User.findByEmail(email);

            if (existingUser) {
                if (existingUser.id_entrenador) {
                    return res.status(409).json({
                        success: false,
                        message: 'Este correo ya tiene una cuenta con un entrenador asignado. Si crees que es un error, contacta a soporte.'
                    });
                }

                await User.updateTrainer(existingUser.id, id_company);
                await User.checkAndClaimInvitation(email, existingUser.id).catch(() => {});

                return res.status(200).json({
                    success: true,
                    isNewUser: false,
                    message: `Tu cuenta ya está conectada con ${trainerLabel}.`
                });
            }

            if (!name) {
                return res.status(400).json({ success: false, message: 'Tu nombre es requerido.' });
            }

            const plainPassword = generatePassword();
            const newUser = {
                email,
                name,
                lastname: lastname || '',
                phone: null,
                image: null,
                password: plainPassword
            };

            const data = await User.create(newUser, id_company);
            await ClientSubscription.bindToUser(email, data.id).catch(() => {});
            await Rol.create(data.id, 3);
            await User.checkAndClaimInvitation(email, data.id).catch(() => {});

            await sendWelcomeCredentialsEmail({
                to: email,
                clientName: name,
                trainerLabel,
                password: plainPassword,
                brandColor,
                logo: companyRow.company_logo
            });

            return res.status(201).json({
                success: true,
                isNewUser: true,
                message: 'Tu cuenta fue creada. Revisa tu correo para tus datos de acceso.'
            });
        } catch (error) {
            console.error('Error en inviteController.acceptInvite:', error);
            return res.status(501).json({ success: false, message: 'Error al aceptar la invitación.' });
        }
    }
};
