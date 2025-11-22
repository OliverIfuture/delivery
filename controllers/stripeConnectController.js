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
            const id_company = req.user.mi_store;
            
            // 1. Cargar datos del entrenador (compañía)
            const company = await User.findCompanyById(id_company);
            if (!company) {
                return res.status(404).json({ success: false, message: 'No se encontró la compañía del entrenador.'});
            }

            let accountId = company.stripeAccountId; 
            
            // --- CORRECCIÓN CRÍTICA: ROBUSTEZ DEL ID DE STRIPE ---
            // Solo consideramos el ID válido si es una cadena y empieza con 'acct_'
            const isValidStripeId = accountId && String(accountId).startsWith('acct_');

            // 2. Si el entrenador AÚN NO tiene un ID de Stripe VÁLIDO, creamos uno
            if (!isValidStripeId) {
                console.log(`[Connect] Creando nueva cuenta Express para ${company.name}. ID actual: ${accountId}`);

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
                console.log(`account creada : ${JSON.stringify(account)}`);

                accountId = account.id;

                // 3. Guardar el nuevo ID (acct_...) en nuestra BD
                // Usamos la función de modelo que incluye copiar las llaves del Admin (que definimos antes)
                await User.updateStripeDataFromAdminId(id_company, accountId);
            } else {
                console.log(`[Connect] Usando cuenta existente: ${accountId}`);
            }
            // -------------------------------------------------------


            // 4. Crear el Link de Onboarding (para un usuario existente o nuevo)
            const accountLink = await stripe.accountLinks.create({
                account: accountId, // Aquí accountId ya está garantizado ser 'acct_...'
                refresh_url: 'https://tu-app.com/stripe/reauth', 
                return_url: 'https://tu-app.com/stripe/success',
                type: 'account_onboarding',
            });

            // 5. Devolver la URL a la app de Flutter
            return res.status(200).json({
                success: true,
                url: accountLink.url
            });

        } catch (error) {
            console.log(`Error en stripeConnectController.createConnectAccount: ${error}`);
            
            // Si el error es la cadena 'false' que persiste (Aún con la corrección), devolvemos un mensaje útil.
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
