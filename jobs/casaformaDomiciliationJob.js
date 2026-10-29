// jobs/casaformaDomiciliationJob.js
//
// Automatización de pagos domiciliados de Casa Forma — corre dentro del
// mismo proceso de Express (no hay worker dyno ni Heroku Scheduler en
// este proyecto todavía), vía setInterval en server.js. Dos pasadas:
//
// 1. Avisar al cliente cuando su próximo cobro cae dentro de
//    domiciliation_rules.reminderDaysBefore días.
// 2. Cancelar (y avisar) las suscripciones que llevan
//    domiciliation_rules.retryDays días seguidos fallando — Stripe ya
//    reintenta el cargo por su cuenta (Smart Retries, configurado del
//    lado de Stripe, no aquí); esto es lo que hace Casa Forma de SU
//    lado si ninguno de esos reintentos funcionó.
//
// Los correos de verdad los manda el PHP/Hostinger de Casa Forma (único
// canal de correo real de este proyecto, ver public/api/*.php en el
// repo del frontend) — este archivo solo le pega por HTTP.
const axios = require('axios');
const CasaformaDomiciliation = require('../models/casaformaDomiciliation');

const MAIL_BASE_URL = 'https://casaforma.com.mx/api';

async function sendDomiciliationReminderEmail(sub) {
    if (!sub.client_email) return;
    await axios.post(`${MAIL_BASE_URL}/send-domiciliation-reminder.php`, {
        email: sub.client_email,
        clientName: sub.client_name,
        planName: sub.package_name,
        amount: sub.amount,
        nextChargeDate: sub.next_charge_date
    }, { timeout: 10000 });
}

async function sendDomiciliationFailedEmail(sub) {
    if (!sub.client_email) return;
    await axios.post(`${MAIL_BASE_URL}/send-domiciliation-failed.php`, {
        email: sub.client_email,
        clientName: sub.client_name,
        planName: sub.package_name,
        amount: sub.amount
    }, { timeout: 10000 });
}

async function sendDomiciliationCancelledEmail(sub) {
    if (!sub.client_email) return;
    await axios.post(`${MAIL_BASE_URL}/send-domiciliation-cancelled.php`, {
        email: sub.client_email,
        clientName: sub.client_name,
        planName: sub.package_name
    }, { timeout: 10000 });
}

async function runDomiciliationChecks() {
    try {
        const settings = await CasaformaDomiciliation.getSettings();
        if (settings.enabled === false) {
            console.log('↪️  casaforma domiciliación: automatización deshabilitada en configuración, se omite esta corrida.');
            return;
        }
        const reminderDays = Number(settings.reminderDaysBefore) || 2;
        const retryDays = Number(settings.retryDays) || 3;

        const needingReminder = await CasaformaDomiciliation.getSubscriptionsNeedingReminder(reminderDays);
        if (needingReminder.length) {
            console.log(`🔔 casaforma domiciliación: ${needingReminder.length} suscripción(es) necesitan aviso de cobro próximo.`);
        }
        for (const sub of needingReminder) {
            try {
                await sendDomiciliationReminderEmail(sub);
                await CasaformaDomiciliation.markReminderSent(sub.id);
                console.log(`✅ casaforma domiciliación: aviso enviado a ${sub.client_email} (sub id=${sub.id}, cobro=${sub.next_charge_date}).`);
            } catch (e) {
                console.log(`❌ casaforma domiciliación: no se pudo avisar a ${sub.client_email} (sub id=${sub.id}): ${e.message}`);
            }
        }

        const toEscalate = await CasaformaDomiciliation.getSubscriptionsToEscalate(retryDays);
        if (toEscalate.length) {
            console.log(`🚫 casaforma domiciliación: ${toEscalate.length} suscripción(es) llevan ${retryDays}+ día(s) fallando, se cancelan.`);
        }
        for (const sub of toEscalate) {
            try {
                await CasaformaDomiciliation.cancel(sub.id);
                await sendDomiciliationCancelledEmail(sub);
                console.log(`✅ casaforma domiciliación: cancelada por fallas repetidas (sub id=${sub.id}, cliente=${sub.client_email}).`);
            } catch (e) {
                console.log(`❌ casaforma domiciliación: error cancelando/avisando sub id=${sub.id}: ${e.message}`);
            }
        }
    } catch (error) {
        console.log(`❌ casaforma domiciliación: error general en runDomiciliationChecks: ${error.message}`);
    }
}

module.exports = {
    runDomiciliationChecks,
    sendDomiciliationReminderEmail,
    sendDomiciliationFailedEmail,
    sendDomiciliationCancelledEmail
};
