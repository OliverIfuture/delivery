const Wallet = require('../models/wallet.js');
const User = require('../models/user.js');
const keys = require('../config/keys.js');
const stripe = require('stripe')(keys.stripeAdminSecretKey); // Usamos la key principal de tu plataforma

module.exports = {

    async createCheckoutSession(req, res, next) {
        try {
            // amount_coins es la cantidad de monedas que quiere comprar
            // price_mxn es cuánto le vas a cobrar en pesos reales
            const { amount_coins, price_mxn } = req.body;
            const id_client = req.user.id;

            if (!amount_coins || !price_mxn) {
                return res.status(400).json({ success: false, message: 'Faltan datos del paquete.' });
            }

            const amountInCents = Math.round(price_mxn * 100);

            // 1. Crear la sesión de Stripe Checkout
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'], // Puedes agregar 'oxxo' aquí en el futuro si Stripe lo habilita en tu cuenta
                line_items: [
                    {
                        price_data: {
                            currency: 'mxn',
                            product_data: {
                                name: `${amount_coins} Premium Coins`,
                                description: 'Monedas virtuales para Trainer+ y Premium Supplements',
                                // images: ['https://tudominio.com/logo-moneda.png'], // Opcional
                            },
                            unit_amount: amountInCents,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',

                // --- METADATA CRÍTICA PARA EL WEBHOOK ---
                metadata: {
                    type: 'wallet_topup',
                    id_client: id_client,
                    coins_to_add: amount_coins
                },

                // Estas URLs son a donde Stripe redirigirá al usuario tras pagar.
                // Como estará en un navegador del móvil, podemos usar "Deep Links" para que la app lo intercepte.
                success_url: 'premiumsupplements://success_topup',
                cancel_url: 'premiumsupplements://cancel_topup',
            });

            // 2. Devolver la URL mágica a Flutter
            return res.status(200).json({
                success: true,
                message: 'Sesión de pago generada',
                url: session.url // <--- ESTO ES LO QUE ABRIRÁS EN FLUTTER CON url_launcher
            });

        } catch (error) {
            console.log(`Error en createCheckoutSession: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al generar la página de pago',
                error: error.message
            });
        }
    },

    async getTransactionHistory(req, res, next) {
        try {
            const id_client = req.user.id;
            const history = await Wallet.getHistoryByUser(id_client);

            // --- NUEVO: Traemos el saldo fresco de la base de datos ---
            const user = await Wallet.getBalance(id_client);

            return res.status(200).json({
                success: true,
                balance: user ? parseFloat(user.balance) : 0, // Mandamos el saldo real
                data: history // Mandamos la lista
            });

        } catch (error) {
            console.log(`Error en getTransactionHistory: ${error}`);
            return res.status(501).json({
                success: false, message: 'Error al obtener el historial', error: error.message
            });
        }
    },

    async getTransactionHistory(req, res, next) {
        try {
            const id_client = req.user.id;
            const history = await Wallet.getHistoryByUser(id_client);

            return res.status(200).json({
                success: true,
                data: history
            });

        } catch (error) {
            console.log(`Error en getTransactionHistory: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener el historial',
                error: error.message
            });
        }
    }
};