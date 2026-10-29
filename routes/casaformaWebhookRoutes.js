// routes/casaformaWebhookRoutes.js
const casaformaWebhookController = require('../controllers/casaformaWebhookController');

module.exports = (app) => {
    // Sin passport: Stripe firma el payload (ver constructEvent en el
    // controller), esa es la autenticación — igual que /api/subscriptions/webhook.
    app.post('/api/casaforma/webhook', casaformaWebhookController.handleWebhook);
};
