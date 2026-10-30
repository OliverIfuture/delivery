const Stripe = require('stripe');
const EmoonPackage = require('../models/emoonPackage');
const EmoonSettings = require('../models/emoonSettings');
const EmoonUser = require('../models/emoonUser');
const keys = require('../config/keys');

// Misma key admin de Stripe que usa el resto de la plataforma (config/keys.js -> STRIPE_ADMIN_SECRET_KEY en Heroku).
const stripeSecretKey = keys.stripeAdminSecretKey || process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Crea (o reutiliza) el Product+Price real para un paquete domiciliado.
// A diferencia de Casa Forma (Connect, un acct_ por club), Emoon no usa
// cuentas conectadas — todo en la cuenta principal, sin `stripeAccount`.
async function ensureStripePrice(pkg) {
    if (pkg.stripe_price_id) return pkg.stripe_price_id;

    const product = await stripe.products.create({ name: pkg.name, type: 'service' });
    const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(Number(pkg.price) * 100),
        currency: 'mxn',
        recurring: { interval: 'day', interval_count: pkg.billing_cycle_days || 30 }
    });
    await EmoonPackage.savePriceIds(pkg.id, product.id, price.id);
    return price.id;
}

module.exports = {
    async createPackagePaymentIntent(req, res) {
        try {
            if (!stripe) {
                return res.status(500).json({
                    success: false,
                    message: 'Stripe no está configurado en el backend.'
                });
            }

            const { packageId } = req.body || {};

            if (!packageId) {
                return res.status(400).json({
                    success: false,
                    message: 'Falta el identificador del paquete.'
                });
            }

            const pkg = await EmoonPackage.getAll();
            const selectedPackage = Array.isArray(pkg) ? pkg.find(item => String(item.id) === String(packageId)) : null;

            if (!selectedPackage) {
                return res.status(404).json({
                    success: false,
                    message: 'No se encontró el paquete solicitado.'
                });
            }

            const amountInCents = Math.round(Number(selectedPackage.price || 0) * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'mxn',
                payment_method_types: ['card'],
                description: `Compra de paquete: ${selectedPackage.name}`,
                metadata: {
                    type: 'package_purchase',
                    package_id: String(packageId),
                    package_name: selectedPackage.name || ''
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Intento de pago creado correctamente.',
                data: {
                    clientSecret: paymentIntent.client_secret,
                    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
                    paymentIntentId: paymentIntent.id,
                    amount: amountInCents,
                    currency: 'mxn'
                }
            });
        } catch (error) {
            console.log('Error en createPackagePaymentIntent:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al crear el intento de pago del paquete.',
                error: error.message
            });
        }
    },

    async createAdminBillingIntent(req, res) {
        try {
            if (!stripe) {
                return res.status(500).json({
                    success: false,
                    message: 'Stripe no está configurado en el backend.'
                });
            }

            const accountId = process.env.STRIPE_CONNECTED_ACCOUNT_ID || 'acct_1TCOsEJu1p2aIMq1';
            const amountInCents = 50600;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'mxn',
                payment_method_types: ['card'],
                description: 'Hosting profesional emoon-studio + Server controller emoon-studio',
                metadata: {
                    type: 'emoon_admin_monthly_service',
                    item_name: 'Hosting profesional + Server controller',
                    due_day: '20',
                    account_id: accountId
                },
                transfer_data: {
                    destination: accountId,
                    amount: amountInCents
                }
            });

            const currentPeriod = new Date().toISOString().slice(0, 7);
            await EmoonSettings.updateBillingStatus('pending', currentPeriod);

            return res.status(200).json({
                success: true,
                message: 'Cobro administrativo creado correctamente.',
                data: {
                    clientSecret: paymentIntent.client_secret,
                    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
                    paymentIntentId: paymentIntent.id,
                    amount: amountInCents,
                    currency: 'mxn',
                    connectedAccountId: accountId
                }
            });
        } catch (error) {
            console.log('Error en createAdminBillingIntent:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al crear el cobro administrativo.',
                error: error.message
            });
        }
    },

    // Checkout de un paquete DOMICILIADO (cargo recurrente) — separado de
    // createPackagePaymentIntent a propósito: ese flujo de pago único ya
    // está probado en producción y no se toca para nada. Este es código
    // 100% nuevo; el webhook (controllers/clientSubscriptionsController.js,
    // branch 'emoon_domiciliado_purchase') es la única fuente de verdad
    // para asignar créditos — el frontend NO debe llamar a /sales/manual
    // tras confirmar este pago.
    async createDomiciliadoCheckout(req, res) {
        try {
            if (!stripe) {
                return res.status(500).json({ success: false, message: 'Stripe no está configurado en el backend.' });
            }

            const userId = req.user.id;
            const { packageId } = req.body || {};
            if (!packageId) {
                return res.status(400).json({ success: false, message: 'Falta el identificador del paquete.' });
            }

            const pkg = await EmoonPackage.getRaw(packageId);
            if (!pkg || pkg.is_active === false) {
                return res.status(404).json({ success: false, message: 'El paquete no existe o ya no está disponible.' });
            }
            if (!pkg.is_domiciliado) {
                return res.status(400).json({ success: false, message: 'Este paquete no es domiciliado.' });
            }

            const user = await EmoonUser.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
            }

            let customer;
            const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
            if (existingCustomers.data.length > 0) {
                customer = existingCustomers.data[0];
            } else {
                customer = await stripe.customers.create({
                    email: user.email,
                    name: `${user.first_name} ${user.last_name || ''}`.trim()
                });
            }

            const priceId = await ensureStripePrice(pkg);

            const subscription = await stripe.subscriptions.create({
                customer: customer.id,
                items: [{ price: priceId }],
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
                metadata: {
                    type: 'emoon_domiciliado_purchase',
                    user_id: String(userId),
                    package_id: String(packageId)
                }
            });

            let clientSecret = '';
            let secretType = 'payment_intent';
            if (subscription.pending_setup_intent) {
                clientSecret = subscription.pending_setup_intent.client_secret;
                secretType = 'setup_intent';
            } else if (subscription.latest_invoice && subscription.latest_invoice.payment_intent) {
                clientSecret = subscription.latest_invoice.payment_intent.client_secret;
            } else {
                throw new Error('Stripe no devolvió un client_secret válido para la suscripción.');
            }

            console.log(`🔁 emoon createDomiciliadoCheckout: Subscription ${subscription.id} creada (user_id=${userId} package_id=${packageId}, secretType=${secretType})`);

            return res.status(200).json({
                success: true,
                data: {
                    mode: 'subscription',
                    secretType,
                    clientSecret,
                    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
                }
            });
        } catch (error) {
            console.log('Error en createDomiciliadoCheckout:', error);
            return res.status(500).json({ success: false, message: 'Error al procesar el pago domiciliado.', error: error.message });
        }
    }
};
