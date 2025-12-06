const User = require('../models/user.js');
const SubscriptionPlan = require('../models/subscriptionPlan.js'); // <--- IMPORTANTE: Agregado
const keys = require('../config/keys.js');

// Inicializamos Stripe con TU llave de Plataforma
const stripe = require('stripe')(keys.stripeAdminSecretKey);

module.exports = {

    /**
     * Crea una Cuenta Conectada (Express) y un Link de Onboarding
     */
    async createConnectAccount(req, res, next) {
        try {
            const id_company = req.user.mi_store;
            
            // 1. Cargar datos del entrenador
            const company = await User.findCompanyById(id_company);
            if (!company) {
                return res.status(404).json({ success: false, message: 'No se encontró la compañía del entrenador.'});
            }

            let accountId = company.stripeAccountId;
            
            // Validar formato del ID
            const isValidStripeId = accountId && String(accountId).startsWith('acct_');

            // 2. Crear cuenta si no existe
            if (!isValidStripeId) {
                console.log(`[Connect] Creando nueva cuenta Express para ${company.name}.`);

                const account = await stripe.accounts.create({
                    type: 'express',
                    email: req.user.email,
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

                // Guardar ID en BD
                await User.updateStripeDataFromAdminId(id_company, accountId);
            } else {
                console.log(`[Connect] Usando cuenta existente: ${accountId}`);
            }

            // 3. Crear Link de Onboarding
            const accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: 'https://tu-app.com/stripe/reauth', // Ajusta a tus deep links reales
                return_url: 'https://tu-app.com/stripe/success',
                type: 'account_onboarding',
            });

            return res.status(200).json({
                success: true,
                url: accountLink.url
            });

        } catch (error) {
            console.log(`Error en createConnectAccount: ${error}`);
            
            const errorMessage = error.message.includes("'false'") 
                ? "Error de configuración: El ID de Stripe de la compañía es inválido." 
                : error.message;

            return res.status(501).json({
                success: false,
                message: 'Error al crear la cuenta de Stripe Connect',
                error: errorMessage
            });
        }
    },
    
    /**
     * Verifica el estado de la cuenta y MIGRA PLANES si está activa
     */
    async getAccountStatus(req, res, next) {
        try {
            const id_company = req.user.mi_store;
            const company = await User.findCompanyById(id_company);
            
            if (!company || !company.stripeAccountId) {
                return res.status(400).json({ success: false, message: 'Este entrenador no tiene una cuenta de Stripe vinculada.'});
            }

            // 1. Consultar a Stripe
            const account = await stripe.accounts.retrieve(company.stripeAccountId);
            const chargesEnabled = account.charges_enabled; // boolean

            // 2. Actualizar DB
            await User.updateStripeDataFromAdmin(id_company, chargesEnabled);

            // --- 3. TRIGGER DE MIGRACIÓN ---
            // Si la cuenta ya puede cobrar, buscamos planes manuales y los subimos a Stripe
            if (chargesEnabled) {
                console.log(`[Connect] Cuenta ${company.stripeAccountId} activa. Verificando planes manuales...`);
                // Ejecutamos la migración sin 'await' para no bloquear la respuesta (Background Task)
                // o con 'await' si queremos asegurar. Usaremos await para logs limpios.
                await _migrateManualPlans(id_company, company.stripeAccountId);
            }
            // -------------------------------

            return res.status(200).json({
                success: true,
                chargesEnabled: chargesEnabled,
                detailsSubmitted: account.details_submitted
            });

        } catch (error) {
            console.log(`Error en getAccountStatus: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener el estado de la cuenta',
                error: error.message
            });
        }
    },

async function _migrateManualPlans(id_company, stripeAccountId) {
    try {
        // 1. Buscar planes marcados como manuales en la BD
        const manualPlans = await SubscriptionPlan.findManualByCompany(id_company);

        if (manualPlans.length === 0) {
            return; // Nada que hacer
        }

        console.log(`[Migración] Encontrados ${manualPlans.length} planes manuales. Subiendo a cuenta ${stripeAccountId}...`);

        for (const plan of manualPlans) {
            try {
                // 2. Crear Producto EN LA CUENTA CONECTADA
                // El header { stripeAccount: ... } es la clave de Stripe Connect
                const product = await stripe.products.create(
                    {
                        name: plan.name,
                        description: plan.description || '',
                        type: 'service',
                    },
                    { stripeAccount: stripeAccountId } // <--- MAGIA DE CONNECT
                );

                // 3. Crear Precio EN LA CUENTA CONECTADA
                const price = await stripe.prices.create(
                    {
                        product: product.id,
                        unit_amount: (plan.price * 100).toFixed(0), // Centavos
                        currency: 'mxn',
                        recurring: { interval: 'month' },
                    },
                    { stripeAccount: stripeAccountId } // <--- MAGIA DE CONNECT
                );

                // 4. Actualizar BD Local
                // Ahora el plan tiene IDs reales y is_manual = false
                await SubscriptionPlan.updateStripeIds(plan.id, product.id, price.id);

                console.log(`-> Plan "${plan.name}" migrado a Stripe Connect.`);

            } catch (innerError) {
                console.error(`X Error migrando plan ${plan.id}: ${innerError.message}`);
            }
        }

    } catch (e) {
        console.error('Error general en migración de planes:', e);
    }
}
};

