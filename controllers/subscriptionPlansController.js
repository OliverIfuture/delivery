const SubscriptionPlan = require('../models/subscriptionPlan.js');
const User = require('../models/user.js'); // **CAMBIO: Importamos User**
const keys = require('../config/keys.js'); // Asumo que tienes tus claves de Stripe aquí o en un .env

// Configurar Stripe (puedes mover esto a un archivo de config si lo prefieres)
// Usamos la clave secreta de la plataforma (Admin) para crear productos en nombre de otras cuentas
// o (mejor) usamos la clave del entrenador si está conectado con Stripe Connect.
// Por simplicidad, usaremos la clave del entrenador.
// const stripe = require('stripe')(keys.stripeSecretKey); 


module.exports = {

    /**
     * Crear un nuevo plan de suscripción
     */
    async create(req, res, next) {
        try {
            const plan = req.body; // { name: "Plan Básico", price: 500 }
            const id_company = req.user.mi_store; // ID del entrenador
            
            // 1. Obtener la compañía (entrenador) para sacar su clave secreta de Stripe
            // **CAMBIO: Llamamos a la función del modelo User**
            const company = await User.findCompanyById(id_company); 
            
            if (!company || !company.stripe_secret_key) {
                return res.status(400).json({
                    success: false,
                    message: 'El entrenador no tiene una clave de Stripe configurada.'
                });
            }
            
            // Inicializar Stripe con la clave secreta del ENTRENADOR
            const stripe = require('stripe')(company.stripe_secret_key);

            // 2. Crear el Producto en Stripe
            const stripeProduct = await stripe.products.create({
                name: plan.name,
                type: 'service', // Es un servicio
            });

            // 3. Crear el Precio (Suscripción mensual) en Stripe
            const stripePrice = await stripe.prices.create({
                product: stripeProduct.id,
                unit_amount: (plan.price * 100).toFixed(0), // Stripe maneja centavos
                currency: 'mxn',
                recurring: {
                    interval: 'month', // Cobrar cada mes
                },
            });

            // 4. Asignar los IDs de Stripe a nuestro objeto de plan
            plan.id_company = id_company;
            plan.stripe_product_id = stripeProduct.id;
            plan.stripe_price_id = stripePrice.id;

            // 5. Guardar el plan en NUESTRA base de datos
            const data = await SubscriptionPlan.create(plan);
            
            return res.status(201).json({
                success: true,
                message: 'El plan de suscripción se ha creado correctamente.',
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

    /**
     * Eliminar (Desactivar) un plan
     */
    async delete(req, res, next) {
        try {
            const id_plan = req.params.id;
            const id_company = req.user.mi_store; // ID del entrenador

            // 1. Obtener el plan de NUESTRA BD para sacar los IDs de Stripe
            const plan = await SubscriptionPlan.findById(id_plan, id_company);
            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: 'El plan no existe o no te pertenece.'
                });
            }

            // 2. Obtener la clave secreta del entrenador
            // **CAMBIO: Llamamos a la función del modelo User**
            const company = await User.findCompanyById(id_company);
            if (!company || !company.stripe_secret_key) {
                return res.status(400).json({
                    success: false,
                    message: 'El entrenador no tiene una clave de Stripe configurada.'
                });
            }

            const stripe = require('stripe')(company.stripe_secret_key);

            // 3. Desactivar el Producto en Stripe (más seguro que borrar)
            await stripe.products.update(plan.stripe_product_id, {
                active: false
            });
            // (Opcional: Desactivar el precio también)
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
