// controllers/casaformaStripeConnectController.js — Stripe Connect real
// para Casa Forma (una sola cuenta Express del club, no una por
// entrenador). Mismo patrón que stripeConnectController.js: se usa la
// llave de la PLATAFORMA (keys.stripeAdminSecretKey) para crear/consultar
// la cuenta conectada; no hace falta ninguna llave ni webhook nuevo.
const CasaformaStripeConnect = require('../models/casaformaStripeConnect');
const keys = require('../config/keys.js');
const stripe = require('stripe')(keys.stripeAdminSecretKey);

module.exports = {
    // Lectura barata de BD — no llama a Stripe (igual que getAccountInfo).
    async getStatus(req, res) {
        try {
            const status = await CasaformaStripeConnect.getStatus();
            return res.status(200).json({ success: true, message: 'OK', data: status });
        } catch (error) {
            console.log('Error casaforma stripe-connect.getStatus:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener el estado de Stripe.', error: error.message });
        }
    },

    // Crea la cuenta Express real (si no existe) + un link de onboarding
    // de un solo uso — igual que createConnectAccount.
    async startOnboarding(req, res) {
        try {
            let current = await CasaformaStripeConnect.getStatus();
            let accountId = current.account_id;
            const isValid = accountId && String(accountId).startsWith('acct_');

            if (!isValid) {
                const account = await stripe.accounts.create({
                    type: 'express',
                    email: req.user.email,
                    business_type: 'individual',
                    company: { name: 'Casa Forma' },
                    capabilities: {
                        card_payments: { requested: true },
                        transfers: { requested: true }
                    }
                });
                accountId = account.id;
                await CasaformaStripeConnect.saveAccountId(accountId);
            }

            const accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: 'https://casaforma.com.mx/admin?tab=pagos',
                return_url: 'https://casaforma.com.mx/admin?tab=pagos',
                type: 'account_onboarding'
            });

            return res.status(200).json({ success: true, message: 'OK', data: { url: accountLink.url } });
        } catch (error) {
            console.log('Error casaforma stripe-connect.startOnboarding:', error);
            return res.status(500).json({ success: false, message: 'Error al crear la cuenta de Stripe.', error: error.message });
        }
    },

    // Consulta a Stripe en vivo y actualiza la BD — igual que
    // getAccountStatus (sin el trigger de migración de planes, que no
    // aplica aquí).
    async refreshStatus(req, res) {
        try {
            const current = await CasaformaStripeConnect.getStatus();
            if (!current.account_id) {
                return res.status(400).json({ success: false, message: 'Todavía no has iniciado tu registro en Stripe.' });
            }

            const account = await stripe.accounts.retrieve(current.account_id);
            await CasaformaStripeConnect.updateChargesStatus(account.charges_enabled, account.details_submitted);

            const status = await CasaformaStripeConnect.getStatus();
            return res.status(200).json({ success: true, message: 'OK', data: status });
        } catch (error) {
            console.log('Error casaforma stripe-connect.refreshStatus:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar el estado.', error: error.message });
        }
    },

    // Enlace de un solo uso al Dashboard Express real — igual que
    // getDashboardLink.
    async getDashboardLink(req, res) {
        try {
            const current = await CasaformaStripeConnect.getStatus();
            if (!current.account_id) {
                return res.status(400).json({ success: false, message: 'Todavía no tienes una cuenta de Stripe conectada.' });
            }
            const loginLink = await stripe.accounts.createLoginLink(current.account_id);
            return res.status(200).json({ success: true, message: 'OK', data: { url: loginLink.url } });
        } catch (error) {
            console.log('Error casaforma stripe-connect.getDashboardLink:', error);
            return res.status(500).json({ success: false, message: 'Error al generar el enlace a tu cuenta de Stripe.', error: error.message });
        }
    }
};
