const User = require('../models/user.js'); 
const keys = require('../config/keys.js'); 

// ¡MUY IMPORTANTE!
// Esta debe ser la Clave Secreta de TU CUENTA DE PLATAFORMA (ADMIN)
// La usas para crear y gestionar las cuentas de tus entrenadores.
const stripe = require('stripe')(keys.stripeAdminSecretKey); 

module.exports = {

    /**
     * Crea una Cuenta Conectada (Express) y un Link de Onboarding
     */
    async createConnectAccount(req, res, next) {
        try {
            const id_company = req.user.mi_store; // ID del entrenador
            
            // 1. Cargar datos del entrenador (compañía)
            const company = await User.findCompanyById(id_company);
            if (!company) {
                return res.status(404).json({ success: false, message: 'No se encontró la compañía del entrenador.'});
            }

            let accountId = company.stripeAccountId; // (Tu columna "stripeAccountId")

            // 2. Si el entrenador AÚN NO tiene un ID de Stripe, creamos uno
            if (!accountId) {
                const account = await stripe.accounts.create({
                    type: 'express',
                    email: req.user.email, // Email del entrenador
                    business_type: 'individual',
                    company: {
                        name: company.name,
                    },
                    capabilities: {
                        card_payments: { requested: true },
                        transfers: { requested: true },
                    },
                });
                
                accountId = account.id;

                // 3. Guardar el nuevo ID (acct_...) en nuestra BD
                await User.updateStripeAccountId(id_company, accountId);
            }

            // 4. Crear el Link de Onboarding (para un usuario existente o nuevo)
            const accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: 'https://tu-app.com/stripe/reauth', // URL de re-autenticación (fallback)
                return_url: 'https://tu-app.com/stripe/success',  // URL de éxito
                type: 'account_onboarding',
            });

            // 5. Devolver la URL a la app de Flutter
            return res.status(200).json({
                success: true,
                url: accountLink.url
            });

        } catch (error) {
            console.log(`Error en stripeConnectController.createConnectAccount: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al crear la cuenta de Stripe Connect',
                error: error.message
            });
        }
    },

    /**
     * Verifica el estado de la cuenta después del onboarding
     */
    async getAccountStatus(req, res, next) {
        try {
            const id_company = req.user.mi_store;
            const company = await User.findCompanyById(id_company);
            
            if (!company || !company.stripeAccountId) {
                return res.status(400).json({ success: false, message: 'Este entrenador no tiene una cuenta de Stripe vinculada.'});
            }

            // Consultar a Stripe el estado de la cuenta
            const account = await stripe.accounts.retrieve(company.stripeAccountId);
            
            const chargesEnabled = account.charges_enabled; // boolean

            // Actualizar nuestro DB
            await User.updateStripeDataFromAdmin(id_company, chargesEnabled);

            return res.status(200).json({
                success: true,
                chargesEnabled: chargesEnabled,
                detailsSubmitted: account.details_submitted
            });

        } catch (error) {
            console.log(`Error en stripeConnectController.getAccountStatus: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener el estado de la cuenta',
                error: error.message
            });
        }
    }
};
