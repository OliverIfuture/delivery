const Stripe = require('stripe');
const EmoonPackage = require('../models/emoonPackage');
const EmoonSettings = require('../models/emoonSettings');
const keys = require('../config/keys');

// Misma key admin de Stripe que usa el resto de la plataforma (config/keys.js -> STRIPE_ADMIN_SECRET_KEY en Heroku).
const stripeSecretKey = keys.stripeAdminSecretKey || process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

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
    }
};
