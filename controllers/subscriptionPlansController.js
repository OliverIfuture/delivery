const SubscriptionPlan = require('../models/subscriptionPlan.js');
const User = require('../models/user.js'); // Importamos User
const keys = require('../config/keys.js'); 

module.exports = {

    /**
     * Crear un nuevo plan de suscripción
     */
const User = require('../models/user'); // Asegúrate de importar el modelo User
const SubscriptionPlan = require('../models/subscription_plan'); // Tu modelo de planes
const stripeLib = require('stripe');

module.exports = {

    // ... (otras funciones) ...

    async create(req, res, next) {
        try {
            const plan = req.body; // { name, description, price, ... }
            const id_company = req.user.mi_store;
            
            // 1. Obtener datos de la compañía para verificar Stripe
            const company = await User.findCompanyById(id_company);
            
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'No se encontró la información del entrenador/gimnasio.'
                });
            }

            // 2. Verificar si tiene Stripe Configurado
            // (Validamos que exista la key y que no esté vacía)
            const hasStripe = company.stripeSecretKey && company.stripeSecretKey.length > 10;

            if (hasStripe) {
                console.log(`[Plan] Creando plan AUTOMÁTICO en Stripe para company ${id_company}...`);

                // --- MODO AUTOMÁTICO (STRIPE) ---
                const stripe = stripeLib(company.stripeSecretKey);

                // A. Crear Producto en Stripe
                const stripeProduct = await stripe.products.create({
                    name: plan.name,
                    description: plan.description || '', // Enviamos la descripción si existe
                    type: 'service',
                });

                // B. Crear Precio en Stripe
                const stripePrice = await stripe.prices.create({
                    product: stripeProduct.id,
                    unit_amount: (plan.price * 100).toFixed(0), // Centavos
                    currency: 'mxn', // O la moneda que manejes
                    recurring: {
                        interval: 'month',
                    },
                });

                // C. Asignar IDs de Stripe
                plan.stripe_product_id = stripeProduct.id;
                plan.stripe_price_id = stripePrice.id;
                plan.is_manual = false; // <--- IMPORTANTE: Bandera para la App

            } else {
                console.log(`[Plan] Creando plan MANUAL (Efectivo) para company ${id_company}...`);

                // --- MODO MANUAL (EFECTIVO) ---
                // Asignamos valores bandera para que la BD no se queje si los campos son NOT NULL
                // O déjalos en NULL si tu BD lo permite.
                plan.stripe_product_id = 'MANUAL'; 
                plan.stripe_price_id = 'MANUAL';
                plan.is_manual = true; // <--- IMPORTANTE: Bandera para la App
            }

            // 3. Completar objeto y Guardar en Base de Datos Local
            plan.id_company = id_company;
            
            // Llamamos a tu modelo SQL. Asegúrate de haber agregado la columna 'is_manual' 
            // en tu sentencia INSERT dentro del modelo SubscriptionPlan.create
            const data = await SubscriptionPlan.create(plan);
            
            return res.status(201).json({
                success: true,
                message: hasStripe 
                    ? 'Plan de suscripción automática creado correctamente.'
                    : 'Plan de cobro manual creado correctamente.',
                data: { 'id': data.id }
            });

        }
        catch (error) {
            console.log(`Error en subscriptionPlansController.create: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al crear el plan de suscripción',
                error: error.message
            });
        }
    },
    
    // ...
};
    /**
     * Eliminar (Desactivar) un plan
     */
    async delete(req, res, next) {
        try {
            const id_plan = req.params.id;
            const id_company = req.user.mi_store; 

            const plan = await SubscriptionPlan.findById(id_plan, id_company);
            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: 'El plan no existe o no te pertenece.'
                });
            }

            // **CORRECCIÓN: Usar camelCase**
            const company = await User.findCompanyById(id_company);
            if (!company || !company.stripeSecretKey) {
                return res.status(400).json({
                    success: false,
                    message: 'El entrenador no tiene una clave de Stripe configurada.'
                });
            }

            // **CORRECCIÓN: Usar camelCase**
            const stripe = require('stripe')(company.stripeSecretKey);

            // 3. Desactivar el Producto en Stripe
            await stripe.products.update(plan.stripe_product_id, {
                active: false
            });
            await stripe.prices.update(plan.stripe_price_id, {
                active: false
            });

            // 4. Eliminar el plan de NUESTRA base de datos
            await SubscriptionPlan.delete(id_plan, id_company);
            
            return res.status(200).json({
                success: true,
                message: 'El plan se ha desactivado y eliminado correctamente.'
            });
        }
        catch (error) {
            console.log(`Error en subscriptionPlansController.delete: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al eliminar el plan',
                error: error.message
            });
        }
    },

    /**
     * Buscar todos los planes creados por un entrenador
     */
    async findByCompany(req, res, next) {
        try {
            const id_company = req.params.id_company;
            const data = await SubscriptionPlan.findByCompany(id_company);
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en subscriptionPlansController.findByCompany: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al buscar los planes',
                error: error
            });
        }
    },

};
