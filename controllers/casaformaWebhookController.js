// controllers/casaformaWebhookController.js
//
// Webhook dedicado de Casa Forma — pagos reales de CLIENTES a la cuenta
// Express del club (único pago y domiciliado/recurrente). Separado del
// webhook de Trainer Partners (clientSubscriptionsController.js) a
// propósito, mismo criterio que casaforma-jwt está aparte de
// emoon-jwt/jwt: un destino de eventos propio en Stripe ("Cuentas
// conectadas" -> /api/casaforma/webhook), firmado con su propio secreto
// (keys.stripeWebhookCasaformaSecret).
//
// Filtra por metadata.type === 'casaforma_package_purchase' en vez de
// confiar solo en el scope del destino — así, aunque el destino de
// Stripe llegue a recibir eventos de otras cuentas conectadas del mismo
// proyecto de Stripe, esto nunca procesa nada que no sea explícitamente
// de Casa Forma (mismo criterio que subMeta.type en
// clientSubscriptionsController.js).
//
// IMPORTANTE: este endpoint no tiene nada que recibir todavía — el
// checkout real de Casa Forma (que crearía el PaymentIntent/Subscription
// con esta metadata) no existe aún; StripeCheckoutModal.vue sigue siendo
// 100% simulado. Este webhook queda listo para cuando se construya.
//
// PENDIENTE para cuando se construya ese checkout: la comisión de
// plataforma (11%, confirmado con el usuario — mismo % que Trainer
// Partners/COBI) va en application_fee_percent: 11 al crear el
// PaymentIntent/Subscription con { stripeAccount: <acct de Casa Forma> }.
// No afecta nada de este archivo: amount_received/amount_paid siguen
// siendo el monto BRUTO que pagó el cliente (Stripe descuenta la
// comisión del lado de la cuenta conectada de forma transparente), que
// es justo lo que aquí se guarda en casaforma_payments.
const keys = require('../config/keys.js');
const adminStripe = require('stripe')(keys.stripeAdminSecretKey);
const CasaformaSale = require('../models/casaformaSale');
const CasaformaDomiciliation = require('../models/casaformaDomiciliation');

module.exports = {
    async handleWebhook(req, res) {
        const sig = req.headers['stripe-signature'];
        let event;

        if (!keys.stripeWebhookCasaformaSecret) {
            console.log('❌ casaforma webhook: falta STRIPE_WEBHOOK_CASAFORMA_SECRET en Heroku.');
            return res.status(500).send('Webhook no configurado.');
        }

        try {
            event = adminStripe.webhooks.constructEvent(req.rawBody, sig, keys.stripeWebhookCasaformaSecret);
        } catch (err) {
            console.log(`❌ casaforma webhook: error en constructEvent: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        console.log(`📩 casaforma webhook recibido: ${event.type} (id=${event.id}, cuenta=${event.account || 'principal'})`);

        try {
            switch (event.type) {
                case 'payment_intent.succeeded': {
                    const pi = event.data.object;
                    const meta = pi.metadata || {};
                    if (meta.type !== 'casaforma_package_purchase') {
                        console.log(`↪️  casaforma webhook: payment_intent.succeeded sin metadata de Casa Forma, se ignora (${pi.id}).`);
                        break;
                    }
                    const payment = await CasaformaSale.recordStripePayment(
                        meta.user_id,
                        meta.package_id,
                        pi.amount_received / 100,
                        pi.id
                    );
                    console.log(`✅ casaforma webhook: pago único registrado (payment id=${payment.id}, cliente=${meta.user_id}, paquete=${meta.package_id}).`);
                    break;
                }

                case 'invoice.payment_succeeded':
                case 'invoice.paid': {
                    const invoice = event.data.object;
                    let meta = invoice.metadata || {};

                    // Igual que en clientSubscriptionsController.js: si la
                    // metadata no viene directo en la factura, se rescata
                    // de la suscripción.
                    if (!meta.type && invoice.subscription) {
                        try {
                            const sub = await adminStripe.subscriptions.retrieve(invoice.subscription, { stripeAccount: event.account });
                            meta = sub.metadata || {};
                        } catch (e) {
                            console.log(`⚠️ casaforma webhook: no se pudo recuperar metadata de la suscripción ${invoice.subscription}: ${e.message}`);
                        }
                    }

                    if (meta.type !== 'casaforma_package_purchase') {
                        console.log(`↪️  casaforma webhook: ${event.type} sin metadata de Casa Forma, se ignora (${invoice.id}).`);
                        break;
                    }
                    if (!invoice.amount_paid || invoice.amount_paid <= 0) {
                        console.log(`↪️  casaforma webhook: ${event.type} con amount_paid=0, se ignora (${invoice.id}).`);
                        break;
                    }

                    const payment = await CasaformaSale.recordStripeRecurringCharge(
                        meta.user_id,
                        meta.package_id,
                        invoice.amount_paid / 100,
                        invoice.subscription
                    );
                    console.log(`✅ casaforma webhook: cobro domiciliado registrado (payment id=${payment.id}, cliente=${meta.user_id}, paquete=${meta.package_id}).`);
                    break;
                }

                case 'invoice.payment_failed': {
                    const invoice = event.data.object;
                    console.log(`⚠️ casaforma webhook: cobro domiciliado fallido (invoice=${invoice.id}, subscription=${invoice.subscription || 'N/A'}).`);
                    break;
                }

                case 'customer.subscription.deleted': {
                    const sub = event.data.object;
                    const cancelled = await CasaformaDomiciliation.cancelByStripeSubscriptionId(sub.id);
                    console.log(cancelled
                        ? `✅ casaforma webhook: domiciliación cancelada en BD (stripe_subscription_id=${sub.id}).`
                        : `↪️  casaforma webhook: customer.subscription.deleted sin domiciliación local para ${sub.id}, se ignora.`);
                    break;
                }

                default:
                    console.log(`↪️  casaforma webhook: evento no manejado: ${event.type}`);
            }

            return res.status(200).json({ received: true });
        } catch (error) {
            console.log(`❌ casaforma webhook: error procesando ${event.type}: ${error.message}`);
            // 200 para que Stripe no reintente infinitamente un evento con
            // datos que nunca van a pasar (ej. metadata incompleta) —
            // mismo criterio que el resto de webhooks de este servidor.
            return res.status(200).json({ received: true, error: error.message });
        }
    }
};
