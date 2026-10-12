// scripts/create_emmanuel_link.js
//
// Script de UN SOLO USO — genera un enlace de domiciliación real para
// Emmanuel Marquez (company 1288, MarquezCrew), plan "Hasta 10 clientes"
// ($299 MXN/mes), SIN los 14 días de prueba (para que el formulario de
// Stripe cobre de inmediato, en vez de crear otra suscripción "trialing"
// fantasma como las 3 anteriores — ver conversación).
//
// Usa el Checkout HOSPEDADO de Stripe (mismo mecanismo que
// createDomiciliationCheckout en membershipController.js), no el
// Payment Element propio del panel — así Emmanuel paga en la página
// real de Stripe, sin pasar por el formulario que tenía el bug.
//
// Correr con: heroku run node scripts/create_emmanuel_link.js --app deliveryserver
// (ajusta el nombre de la app si es distinto)

const keys = require('../config/keys.js');
const db = require('../config/config.js');
const stripe = require('stripe')(keys.stripeAdminSecretKey);

// Mismos valores exactos que PLATFORM_FEE_PERCENT/MEMBERSHIP_TRANSFER_DATA
// en membershipController.js — 11% para COBI, el resto (89%) a la mitad:
// 44.5% transferido a la cuenta Connect, 44.5% se queda en la cuenta admin.
const PLATFORM_FEE_PERCENT = '11';
const MEMBERSHIP_PAYOUT_DESTINATION_ACCOUNT_ID = 'acct_1ShJ6XFREGUwQ83V';
const MEMBERSHIP_TRANSFER_DATA = {
    destination: MEMBERSHIP_PAYOUT_DESTINATION_ACCOUNT_ID,
    amount_percent: (100 - Number(PLATFORM_FEE_PERCENT)) / 2
};

const ID_COMPANY = 1288;
const STRIPE_PRICE_ID = 'price_1UJ0UnFI81PpmIv2zaO2AqqY'; // "Hasta 10 clientes" ($299 MXN/mes)
const PLAN_ID = 'monthly'; // id real del plan en membership_plans

(async () => {
    try {
        const company = await db.one(`SELECT id, membership_stripe_customer_id FROM company WHERE id = $1`, [ID_COMPANY]);
        if (!company.membership_stripe_customer_id) {
            throw new Error('Esta empresa no tiene membership_stripe_customer_id — revisar antes de continuar.');
        }

        const baseUrl = 'https://deliveryserver.herokuapp.com';
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: company.membership_stripe_customer_id,
            line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
            success_url: `${baseUrl}/api/membership/confirmDomiciliation?session_id={CHECKOUT_SESSION_ID}&id_company=${ID_COMPANY}&id_plan=${PLAN_ID}`,
            cancel_url: `${baseUrl}/api/membership/domiciliacionCancelada`,
            subscription_data: {
                transfer_data: MEMBERSHIP_TRANSFER_DATA,
                // SIN días de gracia — cobra de inmediato en vez de abrir
                // un trial de 14 días (eso es lo que creaba una
                // suscripción "trialing" nueva cada intento, sin tarjeta
                // real confirmada, y la base de datos la mostraba como
                // "activa" por el webhook del $0 del trial).
                trial_end: 'now',
                metadata: {
                    type: 'membership_payment',
                    id_company: String(ID_COMPANY),
                    id_plan: PLAN_ID,
                    billing_cycle: 'monthly',
                    platform_fee_percent: PLATFORM_FEE_PERCENT
                }
            }
        });

        console.log('ENLACE PARA EMMANUEL:');
        console.log(session.url);
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        process.exit(0);
    }
})();
