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

    async processSale(req, res, next) {
        try {
            let sale = req.body; 
            sale.id_company = req.user.mi_store;
            sale.id_user_staff = req.user.id;

            // 1. Encontrar el turno activo
            const activeShift = await POS.findActiveShift(sale.id_company, sale.id_user_staff);
            if (!activeShift) {
                return res.status(400).json({ success: false, message: 'No hay un turno de caja abierto. Inicia un turno primero.' });
            }
            sale.id_shift = activeShift.id;

            // 2. Guardar la venta principal en 'pos_sales' (para el corte de caja)
            // (Gracias a la corrección en models/pos.js, esto ahora funciona)
            const saleData = await POS.createSale(sale);
            sale.id = saleData.id; 
            console.log(`POS: Venta registrada ${sale.id} en el turno ${sale.id_shift}`);

            // 3. Iterar el carrito y procesar cada item
            const productsSold = sale.sale_details; // El carrito
            
            for (const item of productsSold) {
                
                if (item.id.toString().startsWith('plan-')) {
                    
                    // --- ES UNA MEMBRESÍA ---
                    if (!sale.id_client) {
                        console.log(`Error Venta ${sale.id}: Membresía ${item.name} sin id_client.`);
                        continue;
                    }
                    
                    // **CORRECCIÓN: Usar 'item.duration_days' (del toSaleDetailJson)**
                    let endDate = new Date();
                    endDate.setDate(endDate.getDate() + parseInt(item.duration_days || 1));

                    const membership = {
                        id_client: sale.id_client,
                        id_company: sale.id_company,
                        plan_name: item.name,
                        price: item.price,
                        end_date: endDate,
                        payment_method: sale.payment_method,
                        payment_id: `pos-sale-${sale.id}` 
                    };
                    
                    await Gym.createMembership(membership);
                    console.log(`POS: Membresía ${item.name} creada para cliente ${sale.id_client}`);

                } else {
                    // --- ES UN PRODUCTO FÍSICO ---
                    
                    // **CORRECCIÓN: Usar 'item.qty' (del toSaleDetailJson)**
                    await POS.updateProductStock(item.id, item.qty || 1);
                    console.log(`POS: Stock de producto ${item.id} actualizado.`);
                }
            }

            return res.status(201).json({ 
                success: true, 
                message: 'Venta registrada exitosamente', 
                data: { id: sale.id } 
            });

        } catch (error) {
            console.log(`Error en posController.processSale: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al procesar la venta', error: error.message });
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
