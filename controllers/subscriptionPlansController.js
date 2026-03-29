const SubscriptionPlan = require('../models/subscriptionPlan.js');
const User = require('../models/user.js');
const keys = require('../config/keys.js');
const db = require('../config/config.js');

module.exports = {

    async create(req, res, next) {
        try {
            const plan = req.body;
            const id_company = req.user.mi_store;

            const company = await User.findCompanyById(id_company);

            // Validamos si la compañía existe
            if (!company) {
                return res.status(404).json({ success: false, message: 'Empresa no encontrada.' });
            }

            // --- LÓGICA HÍBRIDA ---
            // Verificamos si tiene Stripe configurado
            const hasStripe = company.stripeSecretKey && company.stripeSecretKey.length > 0;

            if (hasStripe) {
                // =================================================
                // CAMINO A: CON STRIPE (Tu lógica original intacta)
                // =================================================
                console.log('Creando plan en Stripe...');

                const stripe = require('stripe')(company.stripeSecretKey);

                // 1. Crear Producto
                const stripeProduct = await stripe.products.create({
                    name: plan.name,
                    type: 'service',
                });

                // 2. Crear Precio
                const stripePrice = await stripe.prices.create({
                    product: stripeProduct.id,
                    unit_amount: (plan.price * 100).toFixed(0),
                    currency: 'mxn',
                    recurring: {
                        interval: 'month',
                    },
                });

                // Asignamos IDs reales
                plan.stripe_product_id = stripeProduct.id;
                plan.stripe_price_id = stripePrice.id;
                plan.is_manual = false; // <--- Bandera para la App (Stripe)

            } else {
                // =================================================
                // CAMINO B: MANUAL (Sin Stripe / Efectivo)
                // =================================================
                console.log('Creando plan MANUAL (Sin Stripe)...');

                // Asignamos valores placeholder para que la BD no falle
                plan.stripe_product_id = 'MANUAL';
                plan.stripe_price_id = 'MANUAL';
                plan.is_manual = true; // <--- Bandera para la App (Manual)
            }

            // Guardar en BD (Común para ambos casos)
            plan.id_company = id_company;

            const data = await SubscriptionPlan.create(plan);

            return res.status(201).json({
                success: true,
                message: hasStripe
                    ? 'El plan de suscripción automática se ha creado correctamente.'
                    : 'El plan manual se ha creado correctamente.',
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
            const id_company = req.params.id_company;

            // Buscamos el plan primero para saber si es manual o stripe
            const plan = await SubscriptionPlan.findById(id_plan, id_company);

            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: 'El plan no existe o no te pertenece.'
                });
            }

            // --- LÓGICA DE BORRADO INTELIGENTE ---

            // Solo intentamos desactivar en Stripe si NO es manual y tiene IDs válidos
            // y si la compañía TIENE llaves (por si las borró después de crear el plan)
            const isStripePlan = plan.stripe_product_id !== 'MANUAL' && plan.is_manual !== true;

            if (isStripePlan) {
                const company = await User.findCompanyById(id_company);

                if (company && company.stripeSecretKey) {
                    try {
                        const stripe = require('stripe')(company.stripeSecretKey);

                        // Desactivar Producto
                        await stripe.products.update(plan.stripe_product_id, { active: false });
                        // Desactivar Precio
                        await stripe.prices.update(plan.stripe_price_id, { active: false });

                        console.log('Plan desactivado en Stripe correctamente.');
                    } catch (stripeError) {
                        console.log('Advertencia: No se pudo desactivar en Stripe (quizás ya no existe), pero se borrará localmente.', stripeError.message);
                        // No retornamos error, dejamos que continúe para borrarlo de la BD local
                    }
                }
            }

            // 4. Eliminar el plan de NUESTRA base de datos (Siempre se hace)
            await SubscriptionPlan.delete(id_plan, id_company);

            return res.status(200).json({
                success: true,
                message: 'El plan se ha eliminado correctamente.'
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

    // Traer historial de cobros reales (Stripe + Manuales)
    async getPaymentHistory(req, res, next) {
        try {
            const id_company = req.user.mi_store;
            const { start, end } = req.query;

            if (!id_company) return res.status(403).json({ success: false, message: 'Acceso denegado.' });

            const db = require('../config/config');

            // 🔥 LA MAGIA DE SQL: Unimos los pagos con los planes para obtener el nombre automáticamente
            const sql = `
            SELECT 
                p.id,
                p.payment_date as date,
                p.amount as price,
                COALESCE(s.name, 'Plan Eliminado/Manual') as plan_name
            FROM payment_history p
            LEFT JOIN subscription_plans s ON p.id_plan = s.id
            WHERE p.id_company = $1 
            AND DATE(p.payment_date) >= $2 
            AND DATE(p.payment_date) <= $3
            ORDER BY p.payment_date DESC
        `;

            const payments = await db.manyOrNone(sql, [id_company, start, end]);
            return res.status(200).json(payments);

        } catch (error) {
            console.log(`Error en getPaymentHistory: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener historial de pagos' });
        }
    },

    async createExpense(req, res, next) {
        try {
            const expense = req.body;
            // Obtenemos el ID de la compañía desde el token del usuario logueado
            const id_company = req.user.mi_store;

            if (!id_company) {
                return res.status(403).json({ success: false, message: 'No tienes una compañía asignada.' });
            }

            expense.id_company = id_company;

            const data = await SubscriptionPlan.createExpense(expense);

            return res.status(201).json({
                success: true,
                message: 'El gasto se ha registrado correctamente.',
                data: { 'id': data.id }
            });

        } catch (error) {
            console.log(`Error en SubscriptionPlan.create: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al registrar el gasto',
                error: error.message
            });
        }
    },

    async findByDateRange(req, res, next) {
        try {
            const id_company = req.user.mi_store;
            const { start, end } = req.query; // Fechas vienen por la URL (query params)

            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Acceso denegado.' });
            }

            if (!start || !end) {
                return res.status(400).json({ success: false, message: 'Las fechas de inicio y fin son obligatorias.' });
            }

            const expenses = await SubscriptionPlan.findByCompanyAndDateRange(id_company, start, end);

            return res.status(200).json(expenses);

        } catch (error) {
            console.log(`Error en SubscriptionPlan.findByDateRange: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener los gastos',
                error: error.message
            });
        }
    },

    async deleteExpense(req, res, next) {
        try {
            const id_expense = req.params.id;
            const id_company = req.user.mi_store;

            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Acceso denegado.' });
            }

            await SubscriptionPlan.deleteExpense(id_expense, id_company);

            return res.status(200).json({
                success: true,
                message: 'El gasto se ha eliminado correctamente.'
            });

        } catch (error) {
            console.log(`Error en SubscriptionPlan.delete: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al eliminar el gasto',
                error: error.message
            });
        }
    },

    /**
     * Buscar un plan por ID (Público para el registro)
     */
    async findByIdPublic(req, res, next) {
        try {
            const id_plan = req.params.id;
            const data = await SubscriptionPlan.findByIdPublic(id_plan);

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: 'Plan no encontrado'
                });
            }

            // Devolvemos directamente el objeto del plan
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en subscriptionPlansController.findByIdPublic: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al buscar el plan',
                error: error.message
            });
        }
    },

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

    async getSubscriptionsByDateRange(req, res, next) {
        try {
            const id_company = req.user.mi_store;
            const { start, end } = req.query;

            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Acceso denegado.' });
            }

            // Seleccionamos las suscripciones de los clientes de esa compañía
            // Asegúrate de que tu tabla se llame 'client_subscriptions' y tenga 'created_at'
            const sql = `
            SELECT * FROM client_subscriptions 
            WHERE id_company = $1 
            AND DATE(created_at) >= $2 
            AND DATE(created_at) <= $3
            ORDER BY created_at DESC
        `;

            const subscriptions = await db.manyOrNone(sql, [id_company, start, end]);

            return res.status(200).json(subscriptions);
        } catch (error) {
            console.log(`Error en getSubscriptionsByDateRange: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener ventas' });
        }
    }

};
