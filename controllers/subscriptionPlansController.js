const SubscriptionPlan = require('../models/subscriptionPlan.js');
const User = require('../models/user.js'); // Importamos User
const keys = require('../config/keys.js'); 

module.exports = {

    /**
     * Crear un nuevo plan de suscripción
     */
    async create(req, res, next) {
        try {
            const plan = req.body; 
            const id_company = req.user.mi_store; 
            
            const company = await User.findCompanyById(id_company); 
            
            // **CORRECCIÓN: Usar camelCase**
            if (!company || !company.stripeSecretKey) {
                return res.status(400).json({
                    success: false,
                    message: 'El entrenador no tiene una clave de Stripe configurada.'
                });
            }
            
            // **CORRECCIÓN: Usar camelCase**
            const stripe = require('stripe')(company.stripeSecretKey);

            // 2. Crear el Producto en Stripe
            const stripeProduct = await stripe.products.create({
                name: plan.name,
                type: 'service', 
            });

            // 3. Crear el Precio (Suscripción mensual) en Stripe
            const stripePrice = await stripe.prices.create({
                product: stripeProduct.id,
                unit_amount: (plan.price * 100).toFixed(0), 
                currency: 'mxn',
                recurring: {
                    interval: 'month', 
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
