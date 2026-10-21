// utils/clipClient.js
// Cliente mínimo para la API real de Clip (https://developer.clip.mx).
// Auth: HTTP Basic con base64("API_KEY:SECRET_KEY") — nunca se expone al
// frontend, solo vive aquí en el backend.
const axios = require('axios');
const keys = require('../config/keys.js');

const BASE_URL = 'https://api.payclip.com';

function authHeader() {
    if (!keys.clipApiKey || !keys.clipSecretKey) {
        throw new Error('Clip no está configurado en el servidor (faltan CLIP_API_KEY/CLIP_SECRET_KEY).');
    }
    const token = Buffer.from(`${keys.clipApiKey}:${keys.clipSecretKey}`).toString('base64');
    return `Basic ${token}`;
}

function client() {
    return axios.create({
        baseURL: BASE_URL,
        headers: {
            Authorization: authHeader(),
            'Content-Type': 'application/json'
        },
        timeout: 15000
    });
}

// POST /v2/checkout — crea un link de pago hospedado por Clip.
async function createCheckout({ amount, purchaseDescription, redirectionUrl, webhookUrl, externalReference }) {
    const { data } = await client().post('/v2/checkout', {
        amount,
        currency: 'MXN',
        purchase_description: purchaseDescription,
        redirection_url: redirectionUrl,
        webhook_url: webhookUrl,
        metadata: { external_reference: String(externalReference) }
    });
    return data;
}

// GET /v2/checkout/{payment_request_id} — única fuente de verdad real del
// estado de un pago (el webhook de Clip no trae estado, solo un id).
async function getCheckoutStatus(paymentRequestId) {
    const { data } = await client().get(`/v2/checkout/${paymentRequestId}`);
    return data;
}

// POST /refunds — reembolso total o parcial, identificado por receipt_no
// (el que regresa getCheckoutStatus cuando el pago ya quedó CHECKOUT_COMPLETED).
async function createRefund({ receiptNo, amount, reason }) {
    const { data } = await client().post('/refunds', {
        reference: { type: 'receipt', id: receiptNo },
        amount,
        reason
    });
    return data;
}

module.exports = { createCheckout, getCheckoutStatus, createRefund };
