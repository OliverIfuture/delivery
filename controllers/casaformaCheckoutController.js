// controllers/casaformaCheckoutController.js
//
// Checkout real de Stripe Connect para Casa Forma — mismo patrón
// probado en cobiCheckoutController.js (createCheckout), adaptado a que
// aquí el cliente ya está logueado (no hay que buscar/crear usuario) y a
// que hay UNA sola cuenta conectada (la del club), no una por
// entrenador. Comisión de plataforma: 11% (confirmado con el usuario,
// mismo % que Trainer Partners/COBI), vía application_fee_amount
// (pago único) / application_fee_percent (domiciliado).
const keys = require('../config/keys.js');
const stripe = require('stripe')(keys.stripeAdminSecretKey);
const CasaformaPackage = require('../models/casaformaPackage');
const CasaformaUser = require('../models/casaformaUser');
const CasaformaStripeConnect = require('../models/casaformaStripeConnect');
const CasaformaSettings = require('../models/casaformaSettings');

const PLATFORM_FEE_PERCENT = 11;

// Cuota mensual de plataforma (lo que el ADMIN del club le paga a
// nosotros por usar/alojar el software, nada que ver con lo que pagan
// sus clientes) — mismo concepto y mismo día de corte que Emoon
// (ver emoonPaymentsController.js -> createAdminBillingIntent), pero
// corregido: SIN transfer_data. Emoon manda el cobro con
// transfer_data.destination a una cuenta conectada — eso lo saca de la
// cuenta principal. Aquí es un PaymentIntent normal, sin
// stripeAccount/transfer_data, así que se queda directo en la cuenta
// principal (la misma que ya recibe el 11% de comisiones).
const ADMIN_BILLING_AMOUNT_CENTS = 40500; // $330 servidor + $75 correo
const ADMIN_BILLING_DUE_DAY = '20';

// Crea (o reutiliza) el Product+Price real en la cuenta conectada para
// un paquete domiciliado — hace falta para poder crear la Subscription.
// interval_count en días calza exacto con billing_cycle_days (Stripe
// soporta intervalos de día arbitrarios, no solo mes/año).
async function ensureStripePrice(pkg, stripeAccountId) {
    if (pkg.stripe_price_id) return pkg.stripe_price_id;

    const product = await stripe.products.create(
        { name: pkg.name, type: 'service' },
        { stripeAccount: stripeAccountId }
    );
    const price = await stripe.prices.create(
        {
            product: product.id,
            unit_amount: Math.round(Number(pkg.price) * 100),
            currency: 'mxn',
            recurring: { interval: 'day', interval_count: pkg.billing_cycle_days || 30 }
        },
        { stripeAccount: stripeAccountId }
    );
    await CasaformaPackage.savePriceIds(pkg.id, product.id, price.id);
    return price.id;
}

module.exports = {
    async createCheckout(req, res) {
        try {
            const userId = req.user.id;
            const { package_id } = req.body;
            console.log(`🛒 casaforma createCheckout: user_id=${userId} package_id=${package_id}`);

            const pkg = await CasaformaPackage.getRaw(package_id);
            if (!pkg || pkg.is_active === false) {
                return res.status(404).json({ success: false, message: 'El paquete no existe o ya no está disponible.' });
            }

            const user = await CasaformaUser.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
            }

            const connect = await CasaformaStripeConnect.getStatus();
            if (!connect.account_id || !connect.charges_enabled) {
                return res.status(400).json({ success: false, message: 'Casa Forma todavía no puede recibir pagos con tarjeta. Intenta de nuevo más tarde.' });
            }
            const stripeOpts = { stripeAccount: connect.account_id };

            let customer;
            const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 }, stripeOpts);
            if (existingCustomers.data.length > 0) {
                customer = existingCustomers.data[0];
            } else {
                customer = await stripe.customers.create(
                    { email: user.email, name: `${user.first_name} ${user.last_name || ''}`.trim() },
                    stripeOpts
                );
            }

            if (!pkg.is_domiciliado) {
                const amountInCents = Math.round(Number(pkg.price) * 100);
                const applicationFeeInCents = Math.round(amountInCents * (PLATFORM_FEE_PERCENT / 100));

                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amountInCents,
                    currency: 'mxn',
                    customer: customer.id,
                    automatic_payment_methods: { enabled: true },
                    application_fee_amount: applicationFeeInCents,
                    metadata: {
                        type: 'casaforma_package_purchase',
                        user_id: String(userId),
                        package_id: String(package_id)
                    }
                }, stripeOpts);
                console.log(`💳 casaforma createCheckout: PaymentIntent ${paymentIntent.id} creado por $${pkg.price} MXN (user_id=${userId} package_id=${package_id})`);

                return res.status(200).json({
                    success: true,
                    data: {
                        mode: 'payment',
                        clientSecret: paymentIntent.client_secret,
                        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
                        stripeAccountId: connect.account_id
                    }
                });
            }

            // Domiciliado (recurrente)
            const priceId = await ensureStripePrice(pkg, connect.account_id);

            const subscription = await stripe.subscriptions.create({
                customer: customer.id,
                items: [{ price: priceId }],
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
                application_fee_percent: PLATFORM_FEE_PERCENT,
                metadata: {
                    type: 'casaforma_package_purchase',
                    user_id: String(userId),
                    package_id: String(package_id)
                }
            }, stripeOpts);

            let clientSecret = '';
            if (subscription.pending_setup_intent) {
                clientSecret = subscription.pending_setup_intent.client_secret;
            } else if (subscription.latest_invoice && subscription.latest_invoice.payment_intent) {
                clientSecret = subscription.latest_invoice.payment_intent.client_secret;
            } else {
                throw new Error('Stripe no devolvió un client_secret válido para la suscripción.');
            }
            console.log(`🔁 casaforma createCheckout: Subscription ${subscription.id} creada (user_id=${userId} package_id=${package_id})`);

            return res.status(200).json({
                success: true,
                data: {
                    mode: 'subscription',
                    clientSecret,
                    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
                    stripeAccountId: connect.account_id
                }
            });
        } catch (error) {
            console.log('Error en casaforma createCheckout:', error);
            return res.status(500).json({ success: false, message: 'Error al procesar el pago.', error: error.message });
        }
    },

    // Cobro mensual de plataforma al ADMIN del club ($330 servidor + $75
    // correo = $405). El webhook (ver casaformaWebhookController.js,
    // case 'payment_intent.succeeded', metadata.type ===
    // 'casaforma_admin_billing_monthly') es quien marca 'paid' de
    // verdad — aquí solo se crea el cobro y se marca 'pending', igual
    // que createAdminBillingIntent de Emoon.
    async createAdminBillingCheckout(req, res) {
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: ADMIN_BILLING_AMOUNT_CENTS,
                currency: 'mxn',
                automatic_payment_methods: { enabled: true },
                description: 'Casa Forma · Servicio mensual: Servidor ($330) + Correo ($75)',
                metadata: {
                    type: 'casaforma_admin_billing_monthly',
                    concepto_servidor: '330',
                    concepto_correo: '75',
                    due_day: ADMIN_BILLING_DUE_DAY
                }
            });

            const currentPeriod = new Date().toISOString().slice(0, 7);
            await CasaformaSettings.updateBillingStatus('pending', currentPeriod);

            console.log(`🧾 casaforma createAdminBillingCheckout: PaymentIntent ${paymentIntent.id} creado por $405 MXN (período=${currentPeriod})`);

            return res.status(200).json({
                success: true,
                data: {
                    mode: 'payment',
                    clientSecret: paymentIntent.client_secret,
                    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
                    // Sin stripeAccountId a propósito: es la cuenta principal, no una conectada.
                }
            });
        } catch (error) {
            console.log('Error en casaforma createAdminBillingCheckout:', error);
            return res.status(500).json({ success: false, message: 'Error al crear el cobro mensual.', error: error.message });
        }
    }
};
