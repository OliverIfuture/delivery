const POS = require('../models/pos.js');
const Gym = require('../models/gym.js');

module.exports = {

    // --- PRODUCTOS (CRUD) ---

    async getProducts(req, res, next) {
        try {
            const id_company = req.user.mi_store;
            const data = await POS.getProductsByCompany(id_company);
            return res.status(200).json(data);
        } catch (error) {
            console.log(`Error en posController.getProducts: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener productos', error: error.message });
        }
    },

    async createProduct(req, res, next) {
        try {
            let product = req.body;
            product.id_company = req.user.mi_store;
            const data = await POS.createProduct(product);
            return res.status(201).json({ success: true, message: 'Producto creado', data: { id: data.id } });
        } catch (error) {
            console.log(`Error en posController.createProduct: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al crear producto', error: error.message });
        }
    },

    async updateProduct(req, res, next) {
        try {
            let product = req.body;
            product.id_company = req.user.mi_store;
            await POS.updateProduct(product);
            return res.status(200).json({ success: true, message: 'Producto actualizado' });
        } catch (error) {
            console.log(`Error en posController.updateProduct: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al actualizar producto', error: error.message });
        }
    },

    // --- VENTAS (SALES) ---

// (En controllers/posController.js)

    /**
     * POST /api/pos/sale
     * Registra una venta de productos Y/O pases de día
     */
    async processSale(req, res, next) {
        try {
            // 1. Leer TODOS los datos del body, incluyendo el nuevo token
            const { 
                id_shift, 
                id_client, 
                sale_details, 
                subtotal, 
                total, 
                payment_method,
                day_pass_token // <-- ¡CAMBIO! Leer el token
            } = req.body;
    
            const id_company = req.user.mi_store;
            const id_user_staff = req.user.id;
    
            if (!id_shift || !sale_details || !payment_method) {
                return res.status(400).json({ success: false, message: 'Faltan datos (shift, details, payment).' });
            }
    
            // 2. Construir el objeto 'sale' COMPLETO
            const sale = {
                id_shift: id_shift,
                id_company: id_company,
                id_user_staff: id_user_staff,
                id_client: id_client || null, // Permitir nulo
                sale_details: sale_details,
                subtotal: subtotal,
                total: total,
                payment_method: payment_method,
                day_pass_token: day_pass_token || null // <-- ¡CAMBIO! Añadirlo al objeto
            };
    
            // 3. Crear el registro de Venta (ahora 'sale' contiene el token)
            const data = await POS.createSale(sale);
            const saleId = data.id;
    
            // 4. Bucle para actualizar el stock (esta lógica es importante y ya debería estar allí)
            for (const product of sale_details) {
                // No actualizar stock de membresías o pases de día (que están en pos_products)
                if (product.isMembership === false && product.name?.toUpperCase() !== 'VISITA') { 
                    await POS.updateProductStock(product.id, product.quantity);
                }
            }
    
            return res.status(201).json({
                success: true,
                message: 'Venta registrada exitosamente.',
                data: { id: saleId }
            });

        } catch (error) {
            console.log(`Error en posController.processSale: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al registrar la venta', error: error.message });
        }
    },


    // --- TURNOS (SHIFTS) ---

    async startShift(req, res, next) {
        try {
            const { starting_cash } = req.body;
            const id_company = req.user.mi_store;
            const id_user_staff = req.user.id;

            // 1. Verificar si ya hay un turno abierto
            const existingShift = await POS.findActiveShift(id_company, id_user_staff);
            if (existingShift) {
                return res.status(409).json({ success: false, message: 'Ya tienes un turno abierto.' });
            }
            
            // 2. Crear el nuevo turno
            const data = await POS.startShift(id_company, id_user_staff, starting_cash);
            return res.status(201).json({ success: true, message: 'Turno iniciado', data: { id_shift: data.id } });
        } catch (error) {
            console.log(`Error en posController.startShift: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al iniciar turno', error: error.message });
        }
    },

    async getActiveShift(req, res, next) {
        try {
            const data = await POS.findActiveShift(req.user.mi_store, req.user.id);
            if (!data) {
                return res.status(404).json({ success: false, message: 'No se encontró un turno abierto.' });
            }
            return res.status(200).json({ success: true, data: data });
        } catch (error) {
            console.log(`Error en posController.getActiveShift: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al buscar turno', error: error.message });
        }
    },

    async getSalesByShift(req, res, next) {
        try {
            const id_shift = req.params.id_shift;
            console.log(`el id_shift: ${id_shift}`);
            if (!id_shift) return res.status(400).json({ success: false, message: 'Falta id_shift' });
            
            // (TODO: Añadir validación de seguridad: ¿pertenece este turno a mi compañía?)
            
            const data = await POS.getSalesByShift(id_shift);
            return res.status(200).json(data);
        } catch (error) {
            console.log(`Error en posController.getSalesByShift: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener ventas', error: error.message });
        }
    },

    async closeShift(req, res, next) {
        try {
            const { id_shift, ending_cash, notes } = req.body;
            
            // 1. Obtener todas las ventas de este turno
            const sales = await POS.getSalesByShift(id_shift);

            // 2. Calcular totales
            let total_cash_sales = 0;
            let total_card_sales = 0;
            let total_sales = 0;
            
            for (const sale of sales) {
                const total = parseFloat(sale.total);
                if (sale.payment_method === 'EFECTIVO') {
                    total_cash_sales += total;
                } else if (sale.payment_method === 'TARJETA') {
                    total_card_sales += total;
                }
                total_sales += total;
            }

            // 3. Cerrar el turno en la BD
            await POS.closeShift(id_shift, ending_cash, total_cash_sales, total_card_sales, total_sales, notes);

            return res.status(200).json({ success: true, message: 'Turno cerrado exitosamente' });
        } catch (error) {
            console.log(`Error en posController.closeShift: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al cerrar el turno', error: error.message });
        }
    },

    async generateDayPass(req, res, next) {
        try {
            const { id_shift, duration_hours, price, payment_id } = req.body;
            const id_company = req.user.mi_store;

            const data = await POS.createDayPass(
                id_company, id_shift, duration_hours, price, payment_id
            );

            return res.status(201).json({
                success: true,
                message: 'Pase de día generado.',
                data: {
                    day_pass_token: data.token
                }
            });

        } catch (error) {
            console.log(`Error en posController.generateDayPass: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al generar el pase de día', error: error.message });
        }
    },

    // ... (Tu código existente: processSale, generateDayPass, etc.) ...

    /**
     * GET /api/pos/shifts/totals/:id_shift
     * Obtiene la suma de ingresos y gastos de un turno
     */
    async getShiftTotals(req, res, next) {
        try {
            const id_shift = req.params.id_shift;
            
            // Llama a ambas funciones del modelo en paralelo
            const [incomesData, expensesData] = await Promise.all([
                POS.getSumOfIncomesByShift(id_shift),
                POS.getSumOfExpensesByShift(id_shift)
            ]);

            return res.status(200).json({
                success: true,
                data: {
                    total_incomes: parseFloat(incomesData.total_incomes) || 0,
                    total_expenses: parseFloat(expensesData.total_expenses) || 0
                }
            });

        } catch (error) {
            console.log(`Error en posController.getShiftTotals: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener totales del turno', error: error.message });
        }
    },

    /**
     * POST /api/pos/shifts/income
     * Registra un nuevo ingreso de efectivo
     */
    async createIncome(req, res, next) {
        try {
            const { id_shift, amount, description } = req.body;
            const id_company = req.user.mi_store;
            const id_user_staff = req.user.id;

            if (!id_shift || !amount || !description) {
                return res.status(400).json({ success: false, message: 'Faltan datos (shift, amount, description).' });
            }

            await POS.createIncome(id_company, id_shift, id_user_staff, amount, description);
            
            return res.status(201).json({
                success: true,
                message: 'Ingreso registrado exitosamente.'
            });

        } catch (error) {
            console.log(`Error en posController.createIncome: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al registrar ingreso', error: error.message });
        }
    },

    /**
     * POST /api/pos/shifts/expense
     * Registra un nuevo gasto de efectivo
     */
    async createExpense(req, res, next) {
        try {
            const { id_shift, amount, description } = req.body;
            const id_company = req.user.mi_store;
            const id_user_staff = req.user.id;

            if (!id_shift || !amount || !description) {
                return res.status(400).json({ success: false, message: 'Faltan datos (shift, amount, description).' });
            }

            await POS.createExpense(id_company, id_shift, id_user_staff, amount, description);
            
            return res.status(201).json({
                success: true,
                message: 'Gasto registrado exitosamente.'
            });

        } catch (error) {
            console.log(`Error en posController.createExpense: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al registrar gasto', error: error.message });
        }
    },
};
