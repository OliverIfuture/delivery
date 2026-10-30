// jobs/emoonDomiciliationJob.js
//
// Automatización de pagos domiciliados de Emoon — puerto 1:1 de
// jobs/casaformaDomiciliationJob.js. Corre dentro del mismo proceso de
// Express vía setInterval en server.js. Dos pasadas:
//
// 1. Avisar al cliente cuando su próximo cobro cae dentro de
//    domiciliation_rules.reminderDaysBefore días.
// 2. Cancelar (y avisar) las suscripciones que llevan
//    domiciliation_rules.retryDays días seguidos fallando.
//
// PENDIENTE: MAIL_BASE_URL es un placeholder — falta confirmar con el
// usuario el dominio real de Emoon y si su hosting soporta PHP (igual
// que casaforma.com.mx en Hostinger) para poder subir ahí los
// send-domiciliation-*.php reales. Mientras tanto, estas llamadas van a
// fallar con un error de red/404, lo cual se tolera sin romper nada
// (mismo criterio que casaformaDomiciliationJob.js antes de que
// existieran sus PHP: el aviso falla, pero la fila nunca queda en un
// estado corrupto — ver runDomiciliationChecks más abajo).
const axios = require('axios');
const EmoonDomiciliation = require('../models/emoonDomiciliation');

const MAIL_BASE_URL = 'https://emoon-wellness-studio.com/api'; // TODO: confirmar dominio real con el usuario

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
        const settings = await EmoonDomiciliation.getSettings();
        if (settings.enabled === false) {
            console.log('↪️  emoon domiciliación: automatización deshabilitada en configuración, se omite esta corrida.');
            return;
        }
        const reminderDays = Number(settings.reminderDaysBefore) || 2;
        const retryDays = Number(settings.retryDays) || 3;

        const needingReminder = await EmoonDomiciliation.getSubscriptionsNeedingReminder(reminderDays);
        if (needingReminder.length) {
            console.log(`🔔 emoon domiciliación: ${needingReminder.length} suscripción(es) necesitan aviso de cobro próximo.`);
        }
        for (const sub of needingReminder) {
            try {
                await sendDomiciliationReminderEmail(sub);
                await EmoonDomiciliation.markReminderSent(sub.id);
                console.log(`✅ emoon domiciliación: aviso enviado a ${sub.client_email} (sub id=${sub.id}, cobro=${sub.next_charge_date}).`);
            } catch (e) {
                console.log(`❌ emoon domiciliación: no se pudo avisar a ${sub.client_email} (sub id=${sub.id}): ${e.message}`);
            }
        }

        const toEscalate = await EmoonDomiciliation.getSubscriptionsToEscalate(retryDays);
        if (toEscalate.length) {
            console.log(`🚫 emoon domiciliación: ${toEscalate.length} suscripción(es) llevan ${retryDays}+ día(s) fallando, se cancelan.`);
        }
        for (const sub of toEscalate) {
            try {
                await EmoonDomiciliation.cancel(sub.id);
                await sendDomiciliationCancelledEmail(sub);
                console.log(`✅ emoon domiciliación: cancelada por fallas repetidas (sub id=${sub.id}, cliente=${sub.client_email}).`);
            } catch (e) {
                console.log(`❌ emoon domiciliación: error cancelando/avisando sub id=${sub.id}: ${e.message}`);
            }
        }
    } catch (error) {
        console.log(`❌ emoon domiciliación: error general en runDomiciliationChecks: ${error.message}`);
    }
}

module.exports = {
    runDomiciliationChecks,
    sendDomiciliationReminderEmail,
    sendDomiciliationFailedEmail,
    sendDomiciliationCancelledEmail
};
