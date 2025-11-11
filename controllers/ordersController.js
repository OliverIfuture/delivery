import('conekta').then((conekta) => console.log(conekta.default.Customer.post));
//import { CustomersApi, Configuration, Customer, CustomerResponse } from "conekta";

const apikey = "key_pt4c0MM2XKF8HXGytMz2OFJ";
const { findByDeliveryAndStatus } = require('../models/order');
const Order = require('../models/order');
const OrderHasProducts = require('../models/order_has_products');

module.exports = {



    async createPymentInten(req, res, next) {
        try {
            const usertoken = req.params.usertoken;
            const amount = req.params.amount;
            
            const stripe = require('stripe')(usertoken);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'mxn',
                automatic_payment_methods: {
                    enabled: true,
                },
            });
            console.log(`el payment intent : ${JSON.stringify(paymentIntent)}`);
            return res.status(201).json(paymentIntent);

        }
        catch (err) {
            console.log(`Error: ${err}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de crear el',
                error: err,
                success: false


            });
        }

    },


    async findByDeliveryAndStatus(req, res, next) {
        try {
            const id_delivery = req.params.id_delivery;
            const status = req.params.status;

            const data = await Order.findByDeliveryAndStatus(id_delivery, status);
            console.log(`Delivery status: ${JSON.stringify(data)}`);
            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las ordenes por estado',
                error: error,
                success: false


            });
        }
    },

    async findByStatus(req, res, next) {
        try {
            const status = req.params.status;
            const id_order_company = req.params.id_order_company ?? 1; // <= valor por defecto

            const data = await Order.findByStatus(status, id_order_company);
            console.log(`Status: ${JSON.stringify(data)}`);
            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las ordenes por estado',
                error: error,
                success: false


            });
        }
    },
    async findByClient(req, res, next) {

        try {
            const id_client = req.params.id_client;

            const data = await Order.findByClient(id_client);
            console.log(`Datos enviados del order: ${JSON.stringify(data)}`);

            return res.status(201).json(data);
        }
        catch (error) {
            console.log(`Error ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las ordenes por estado',
                error: error,
                success: false
            })
        }

    },

   async getByClientAndStatusWeb(req, res, next) {

        try {
            const id_client = req.params.id_client;

            const data = await Order.getByClientAndStatusWeb(id_client);
                        console.log(`orden creada: ${JSON.stringify(data)}`);

            return res.status(201).json(data);
        }
        catch (error) {
            console.log(`Error ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las ordenes por estado',
                error: error,
                success: false
            })
        }

    },
    
    async findByClientAndStatus(req, res, next) {

        try {
            const id_client = req.params.id_client;
            const status = req.params.status;

            const data = await Order.findByClientAndStatus(id_client, status);
            return res.status(201).json(data);
        }
        catch (error) {
            console.log(`Error ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las ordenes por estado',
                error: error,
                success: false
            })
        }

    },

    async updateCode (req, res, next) {
        try {

            const id = req.params.id;
            const code = req.params.code;
            await Order.updateCode(id, code);

            return res.status(201).json({
                success: true,
                message: 'La orden se actualizo correctamente',
            });

        }
        catch (error) {
            console.log(`Error ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error al actualizar la orden',
                error: error
            });
        }
    },
    
    async updateLatLng(req, res, next) {
        try {

            let order = req.body;
            await Order.updateLatLng(order);

            return res.status(201).json({
                success: true,
                message: 'La orden se actualizo correctamente',
            });

        }
        catch (error) {
            console.log(`Error ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error al actualizar la orden',
                error: error
            });
        }
    },


    async updateToDespatched(req, res, next) {
        try {

            let order = req.body;
            order.status = 'DESPACHADO';
            await Order.update(order);

            return res.status(201).json({
                success: true,
                message: 'La orden se actualizo correctamente',
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error al actualizar la orden',
                error: error
            });
        }
    },


    async updateToOnTheWay(req, res, next) {
        try {

            let order = req.body;
            order.status = 'EN CAMINO';
            await Order.update(order);

            return res.status(201).json({
                success: true,
                message: 'La orden se actualizo correctamente',
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error al actualizar la orden',
                error: error
            });
        }
    },


      async updateToDelivered(req, res, next) {
        try {
            let order = req.body; // Asumimos que 'order' tiene {id, paymethod, affiliate_referral_id, id_company, total}
            order.status = 'ENTREGADO';
            
            // 1. Actualizar el estado del pedido
            // (Usamos updateStatus, que es más limpio que 'update')
            await Order.updateStatus(order.id, order.status); 

            // --- **INICIO LÓGICA DE COMISIÓN (EFECTIVO)** ---
            try {
                // Si ES efectivo Y tiene referido
                if (order.paymethod === 'EFECTIVO' && order.affiliate_referral_id && order.id_company) {
                    console.log(`[Afiliado] Orden (Efectivo) ${order.id} detectada como ENTREGADA.`);
                    
                    const vendorCompany = await User.findCompanyById(order.id_company);
                    if (vendorCompany && vendorCompany.acceptsAffiliates === true) {
                        console.log(`[Afiliado] Tienda ${vendorCompany.name} acepta. Tasa: ${vendorCompany.affiliateCommissionRate}. Calculando...`);
                        await Affiliate.createCommission(order, vendorCompany);
                        console.log(`[Afiliado] Comisión guardada para Entrenador ${order.affiliate_referral_id}.`);
                    } else {
                        console.log(`[Afiliado] Tienda no participa. No se genera comisión.`);
                    }
                }
            } catch (e) {
                console.log(`[Afiliado] Error al calcular comisión (La orden SÍ se entregó): ${e.message}`);
            }
            // --- **FIN LÓGICA DE COMISIÓN** ---

            return res.status(201).json({
                success: true,
                message: 'La orden se entrego correctamente',
            });

        } 
        catch (error) {
            console.log(`Error ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error al actualizar la orden',
                error: error.message
            });
        }
    },

    async cancelOrder(req, res, next) {
        try {

            let order = req.body;
            order.status = 'CANCELADO';
            await Order.cancelOrder(order);

            return res.status(201).json({
                success: true,
                message: 'La orden se cancelo correctamente',
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error al cencelar la orden',
                error: error
            });
        }
    },
    /**
     * Esta función maneja órdenes que YA ESTÁN PAGADAS (ej. con tarjeta)
     * Por lo tanto, debe calcular la comisión.
     */
    async create(req, res, next) {
        
        try {
            let order = req.body;
            order.status = 'PAGADO'; // Confirmamos que está pagado

            // 1. Guardar la orden (incluyendo affiliate_referral_id)
            const data = await Order.create(order);
            order.id = data.id; // Asignamos el ID devuelto a nuestro objeto

            // 2. Guardar los productos de la orden
            let products = order.products;
            for (const product of products) {
                // ... (Tu lógica de guardar productos) ...
                if (product.id < 10000) {
                    await OrderHasProducts.create(data.id, product.id, product.quantity);
                }
                if (product.id > 10000) {
                    await OrderHasProducts.create(data.id, product.id, product.quantity);
                }
                if (Product.updateStock) {
                     await Product.updateStock(product.id, product.quantity);
                }
            }

            // --- **INICIO LÓGICA DE COMISIÓN (TARJETA)** ---
            try {
                // Si NO es efectivo (es tarjeta, etc.) Y tiene referido
                if (order.paymethod !== 'EFECTIVO' && order.affiliate_referral_id && order.id_company) {
                    console.log(`[Afiliado] Orden ${order.id} (Tarjeta) detectada. Calculando comisión...`);
                    
                    const vendorCompany = await User.findCompanyById(order.id_company);

                    if (vendorCompany && vendorCompany.acceptsAffiliates === true) {
                        await Affiliate.createCommission(order, vendorCompany); 
                        console.log(`[Afiliado] Comisión guardada para Entrenador ${order.affiliate_referral_id}.`);
                    } else {
                        console.log(`[Afiliado] Tienda ${vendorCompany ? vendorCompany.name : 'ID ' + order.id_company} no participa. No se genera comisión.`);
                    }
                }
            } catch (e) {
                console.log(`[Afiliado] Error al calcular comisión (La orden SÍ se creó): ${e.message}`);
            }
            // --- **FIN DE LA LÓGICA DE COMISIÓN** ---

            return res.status(201).json({
                success: true,
                message: 'La orden se creo correctamente',
                data: data.id
            });

        } 
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error creado la orden',
                error: error.message
            });
        }
    },


    /**
     * Esta función maneja órdenes en EFECTIVO (PENDIENTE DE PAGO)
     * NO debe calcular comisión aquí.
     */
    async createCashOrder(req, res, next) {
        try {
            let order = req.body;
            console.log(`orden creada: ${JSON.stringify(order)}`);

            order.status = 'PENDIENTE DE PAGO';
            
            // 1. Guardar la orden (incluyendo el affiliate_referral_id, si existe)
            const data = await Order.create(order);

            // 2. Guardar productos (Tu lógica de bucle)
            for (const product of order.products) {
                if (product.id < 1000) { 
                    await OrderHasProducts.create(data.id, product.id, product.quantity);
                }
                if (product.id > 1000) { 
                    await OrderHasProducts.create(data.id, product.id, product.quantity);
                }
            }

            return res.status(201).json({
                success: true,
                message: 'La orden se creo correctamente',
                data: data.id
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error creado la orden',
                error: error.message
            });
        }
    },

     async createSale(req, res, next) {
        try {
            let sales = req.body;
            // 1. Crear el registro principal de la venta
            const data = await Order.createSale(sales); 

            ////recorrer todos los productos de la orden
            for (const product of sales.products) {
                
                // 3. **LÓGICA CORREGIDA: CALCULAR Y ACTUALIZAR EL STOCK**
                //    Parseamos los valores a números para hacer la resta
                const currentStock = parseInt(product.state || '0'); 
                const soldQuantity = parseInt(product.quantity || '0');
                
                // Calculamos el nuevo stock
                // **CORRECCIÓN: 'newStock' se declara DENTRO del loop con 'const'**
                const newStock = currentStock - soldQuantity; 

                console.log(`Actualizando stock para Producto ID ${product.id}:`);
                console.log(`  Stock Actual (product.state): ${currentStock}`);
                console.log(`  Cantidad Vendida: ${soldQuantity}`);
                console.log(`  Nuevo Stock Calculado: ${newStock}`);

                // 2. Insertar el detalle de la venta (el producto vendido)
                //    (Ahora se pasa 'newStock' a la función)
                await OrderHasProducts.createSale(
                    product.name, 
                    product.price, 
                    product.image1, 
                    product.price_buy, 
                    sales.reference, 
                    product.quantity, 
                    sales.shift_ref,
                    newStock, // Pasando el stock ya calculado
                    product.id
                );
            }

            return res.status(201).json({
                success: true,
                message: 'La orden se creo correctamente',
                data: data.id
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error creado la orden',
                error: error
            });
        }
    },

    async selectOrder(req, res, next) {
        try {
            const date = req.params.date;
            const shift_ref = req.params.shift_ref;

            const data = await Order.selectOrder(date, shift_ref);
            console.log(`Status: ${JSON.stringify(data)}`);
            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las ventas',
                error: error,
                success: false


            });
        }
    },
    async selectOrderAll(req, res, next) {
        try {
            const date = req.params.date;

            const data = await Order.selectOrderAll(date);
            console.log(`Status: ${JSON.stringify(data)}`);
            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las ventas',
                error: error,
                success: false


            });
        }
    },
    async ShiftOrders(req, res, next) {
        try {
            const shift_ref = req.params.shift_ref;

            const data = await Order.ShiftOrders(shift_ref);
            console.log(`Status: ${JSON.stringify(data)}`);
            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las ventas',
                error: error,
                success: false


            });
        }
    },



    async ClientOrdersGet(req, res, next) {
        try {
            const id = req.params.id;

            const data = await Order.ClientOrdersGet(id);
            console.log(`Status: ${JSON.stringify(data)}`);
            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las ventas',
                error: error,
                success: false


            });
        }
    },

    async closeShift(req, res, next) {
        try {

            const sales = req.body;
            console.log(`Status: ${JSON.stringify(sales)}`);



            const data = await Order.closeShift(sales);
            console.log(`Status: ${JSON.stringify(data)}`);

            return res.status(201).json({

                success: true,
                message: 'Cierre se realizo correctamente',
                data: data.id
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error creado la orden',
                error: error
            });
        }
    },

    async insertDateExpenses(req, res, next) {
        try {

            const sales = req.body;
            console.log(`Status: ${JSON.stringify(sales)}`);



            const data = await Order.insertDateExpenses(sales);
            console.log(`Status: ${JSON.stringify(data)}`);

            return res.status(201).json({

                success: true,
                message: 'gasto capturado correctamente',
                data: data.id
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error capturando el gasto',
                error: error
            });
        }
    },

    async insertDateIncome(req, res, next) {
        try {

            const sales = req.body;
            console.log(`Status: ${JSON.stringify(sales)}`);



            const data = await Order.insertDateIncome(sales);
            console.log(`Status: ${JSON.stringify(data)}`);

            return res.status(201).json({

                success: true,
                message: 'Ingresos capturado correctamente',
                data: data.id
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error capturando el ingreso',
                error: error
            });
        }
    },


    async selectOpenShift(req, res, next) {
        try {
            const id_company = req.params.id_company;

            const data = await Order.selectOpenShift(id_company);
            console.log(`Status: ${JSON.stringify(data)}`);
            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las ventas',
                error: error,
                success: false


            });
        }
    },
    async selectOpenShiftExpenses(req, res, next) {
        try {
            const id_company = req.params.id_company;

            const data = await Order.selectOpenShiftExpenses(id_company);
            console.log(`Status: ${JSON.stringify(data)}`);
            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las ventas',
                error: error,
                success: false


            });
        }
    },


    async selectTotals(req, res, next) {
        try {

            const shift_ref = req.params.shift_ref;

            const data = await Order.selectTotals(shift_ref);
            console.log(`Datos enviados del usuario entrenador: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener el usuario por ID'
            });
        }
    },


    async selectExpenses(req, res, next) {
        try {

            const shift_ref = req.params.shift_ref;

            const data = await Order.selectExpenses(shift_ref);
            console.log(`Datos enviados de los gastos: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener los gastos'
            });
        }
    },


    async selectIncomes(req, res, next) {
        try {

            const shift_ref = req.params.shift_ref;

            const data = await Order.selectIncomes(shift_ref);
            console.log(`Datos enviados de los gastos: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener los gastos'
            });
        }
    },

    async closeShiftClose(req, res, next) {
        try {

            const id_Close_Shift = req.params.id_Close_Shift;
            const income = req.params.income;
            const expenses = req.params.expenses;
            const change = req.params.change;
            const total = req.params.total;
            const total_card = req.params.total_card;
            const total_cash = req.params.total_cash;
            const final_cash = req.params.final_cash;

            const data = await Order.closeShiftClose(id_Close_Shift, income, expenses, change, total, total_card, total_cash, final_cash);
            console.log(`${JSON.stringify(data)}`);
            return res.status(201).json({
                success: true,
                message: 'El cierre se realizo correctamente',
            });

        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al realizar el cierre'
            });
        }
    },


    async deleteExpenses(req, res, next) {
        try {

            const id = req.params.id;

            const data = await Order.deleteExpenses(id);
            console.log(`a eliminar gasto: ${JSON.stringify(data)}`);


            return res.status(201).json({

                success: true,
                message: 'El gasto se elimino correctamente',
            });


        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error eliminando el gasto',
                error: error
            });
        }
    },

    async deleteIncomes(req, res, next) {
        try {

            const id = req.params.id;

            const data = await Order.deleteIncomes(id);
            console.log(`a eliminar ingreso: ${JSON.stringify(data)}`);


            return res.status(201).json({

                success: true,
                message: 'El ingreso se elimino correctamente',
            });


        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error eliminando el ingreso',
                error: error
            });
        }
    },

    async selectShiftClose(req, res, next) {
        try {
            const data = await Order.selectShiftClose();
            console.log(`Cierres: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener'
            });
        }
    },

    async findByClientDealer(req, res, next) {

        try {
            const id_client = req.params.id_client;
            const shift_ref = req.params.shift_ref;

            const data = await Order.findByClientDealer(id_client, shift_ref);
            console.log(`Ordenes: ${JSON.stringify(data)}`);

            return res.status(201).json(data);
        }
        catch (error) {
            console.log(`Error ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las compras',
                error: error,
                success: false
            })
        }

    },

    async findByClientDealerRecharge(req, res, next) {

        try {
            const id_client = req.params.id_client;
            const data = await Order.findByClientDealerRecharge(id_client);
            console.log(`Recargas: ${JSON.stringify(data)}`);

            return res.status(201).json(data);
        }
        catch (error) {
            console.log(`Error ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las recargas',
                error: error,
                success: false
            })
        }

    },

        async insertRecharge(req, res, next) {
        try {

            const id_client = req.params.id_client;
            const balance = req.params.balance;
            await Order.insertRecharge(id_client, balance);

            return res.status(201).json({
                success: true,
                message: 'La recarga se realizo correctamente',
            });

        }
        catch (error) {
            console.log(`Error ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error al arealizar la recarga',
                error: error
            });
        }
    },

async createrecharge(req, res, next) {
        try {

            let recharge = req.body;
            console.log(`el recharge : ${JSON.stringify(recharge)}`);

            const data = await Order.createrecharge(recharge);
            return res.status(201).json({

                success: true,
                message: 'La recarga se creo correctamente',
                data: data.id
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error creando la recarga',
                error: error
            });
        }
    },

async createOrdeDealer(req, res, next) {
        try {

            let order = req.body;
            console.log(`el createOrdeDealer : ${JSON.stringify(order)}`);

            const data = await Order.createOrdeDealer(order);
            return res.status(201).json({

                success: true,
                message: 'La compra se creo correctamente',
                data: data.id
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error creando la compra',
                error: error
            });
        }
    },    

    
async createrechargegym(req, res, next) {
        try {

            let recharge = req.body;
            console.log(`el recharge : ${JSON.stringify(recharge)}`);

            const data = await Order.createrechargegym(recharge);
            return res.status(201).json({

                success: true,
                message: 'La recarga se creo correctamente',
                data: data.id
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error creando la recarga',
                error: error
            });
        }
    },    


async findByClientDealerRechargeGym(req, res, next) {

        try {
            const id_sucursal = req.params.id_sucursal;
            const shift_ref =   req.params.shift_ref;
            const data = await Order.findByClientDealerRechargeGym(id_sucursal, shift_ref);
            return res.status(201).json(data);
        }
        catch (error) {
            console.log(`Error ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las recargas',
                error: error,
                success: false
            })
        }

    },

     async getSumShift(req, res, next) {
        try {
            const id_sucursal = req.params.id_sucursal;
            const shift_ref =   req.params.shift_ref;

            const data = await Order.getSumShift(id_sucursal, shift_ref);
            console.log(`el getSumShift : ${JSON.stringify(data)}`);

            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener el total de efectivo en caja',
                error: error,
                success: false
            });
        }
    },  


      async  getCortes(req, res, next) {
        try {
            const id_sucursal = req.params.id_sucursal;
            const shift_ref =   req.params.shift_ref;

            const data = await Order.getCortes(id_sucursal, shift_ref);
            console.log(`el getCortes : ${JSON.stringify(data)}`);

            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener el total de efectivo en caja',
                error: error,
                success: false
            });
        }
    },     



    
async getShiftTurn(req, res, next) {
        try {
            const id_sucursal = req.params.id_sucursal;
            const data = await Order.getShiftTurn(id_sucursal);
            console.log(`el getShiftTurn : ${JSON.stringify(data)}`);

            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener los datos del turno',
                error: error,
                success: false
            });
        }
    },  


 async closeShiftGym(req, res, next) {
        try {

            let shiftGym = req.body;
            console.log(`el shiftGym : ${JSON.stringify(shiftGym)}`);

            const data = await Order.closeShiftGym(shiftGym);
            return res.status(201).json({

                success: true,
                message: 'turno cerrado correctamente'
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error cerrando turno',
                error: error
            });
        }
    }, 

 async insertNewTurnGym(req, res, next) {
        try {

            let shiftGym = req.body;
            console.log(`el insertNewTurnGym : ${JSON.stringify(shiftGym)}`);

            const data = await Order.insertNewTurnGym(shiftGym);
            return res.status(201).json({

                success: true,
                message: 'turno abierto correctamente'
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error abriendo turno',
                error: error
            });
        }
    },     
    
 async updateToCancelClient(req, res, next) {
        try {

            const id = req.params.id;
            const data = await Order.updateToCancelClient(id);
            return res.status(201).json({

                success: true,
                message: 'recarga cancelada en gym'
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error cancelando en gym',
                error: error
            });
        }
    },    
  
     async updateToCancelClientToClient(req, res, next) {
        try {

            const id = req.params.id;
            const balance = req.params.balance;
            const data = await Order.updateToCancelClientToClient(id, balance);
            return res.status(201).json({

                success: true,
                message: 'recarga cancelada en cliente'
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error cancelando en cliente',
                error: error
            });
        }
    },    


async  getDealers(req, res, next) {
        try {
            const sucursalId = req.params.sucursalId;

            const data = await Order.getDealers(sucursalId);
            console.log(`el getDealers : ${JSON.stringify(data)}`);

            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener el total de efectivo en caja',
                error: error,
                success: false
            });
        }
    },     



     async getNotifications(req, res, next) {
        try {
            const idUser = req.params.userid;

            const data = await Order.getNotifications(idUser);
            console.log(`el notifications : ${JSON.stringify(data)}`);

            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las notificaciones',
                error: error,
                success: false
            });
        }
    },  

async createNotification(req, res, next) {
        try {

            let notification = req.body;
            console.log(`el recharge : ${JSON.stringify(notification)}`);

            const data = await Order.createNotification(notification);
            return res.status(201).json({

                success: true,
                message: 'La notificacion se cargo correctamente',
                data: data.id
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error creando la notificacion',
                error: error
            });
        }
    },

    async  getAppoiments(req, res, next) {
        try {
            const userId = req.params.userId;

            const data = await Order.getAppoiments(userId);
            console.log(`el appoiments : ${JSON.stringify(data)}`);
            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las citas',
                error: error,
                success: false
            });
        }
    }, 

        async  getAppoimentsByCompany(req, res, next) {
        try {
            const id = req.params.id;

            const data = await Order.getAppoimentsByCompany(id);
            console.log(`el appoiments : ${JSON.stringify(data)}`);
            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las citas',
                error: error,
                success: false
            });
        }
    },

       async updateAppointmentStatus (req, res, next) {
        try {

            const id = req.params.appointmentId;
            const newStatus = req.params.newStatus;
            await Order.updateAppointmentStatus(id, newStatus);

            return res.status(201).json({
                success: true,
                message: 'La cita se actualizo correctamente',
            });

        }
        catch (error) {
            console.log(`Error ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error al actualizar la cita',
                error: error
            });
        }
    }, 

       async updateSaleStatus (req, res, next) {
        try {

            const id = req.params.id;
            const status = req.params.status;
            await Order.updateSaleStatus(id, status);

            return res.status(201).json({
                success: true,
                message: 'La orden se actualizo correctamente',
            });

        }
        catch (error) {
            console.log(`Error ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error al actualizar la orden',
                error: error
            });
        }
    },


          async  getSalesByDateRange(req, res, next) {
        try {
            const id = req.params.id;
            const startDate = req.params.startDate;
            const endDate = req.params.endDate;

            const data = await Order.getSalesByDateRange(id, startDate, endDate);
            console.log(`el reporte de dias : ${JSON.stringify(data)}`);
            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las ventas',
                error: error,
                success: false
            });
        }
    },


   async createCotization(req, res, next) {
        try {
            let order = req.body;
            const data = await Order.createCotization(order); 

            return res.status(201).json({
                success: true,
                message: 'La cotizacion se creo correctamente',
                data: data.id
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error creado la cotizacion',
                error: error
            });
        }
    },
  

    async getSavedCotizations(req, res, next) {
        try {
            const id = req.params.id;

            const data = await Order.getSavedCotizations(id);
            console.log(`getSavedCotizations: ${JSON.stringify(data)}`);
            return res.status(201).json(data);

        } catch (error) {

            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las cotizaciones',
                error: error,
                success: false


            });
        }
    },



  async confirmCotization(req, res, next) {
        try {
            const id = req.params.id;
            
            // 1. Llamamos a la nueva funcion en el modelo (Order.confirm)
            // Esta funcion hara la transaccion y nos devolvera un resultado detallado
            const data = await Order.confirm(id);

            // 2. El modelo nos devolverá un objeto con el estado
            if (!data.success) {
                // Si no fue exitoso (ej. sin stock o expirada), 
                // devolvemos el status y mensaje de error que preparó el modelo
                return res.status(data.statusCode || 409).json({ // 409 Conflict (sin stock) o 410 (Expirada)
                    success: false,
                    message: data.message,
                    error: data.error,
                    data: data.data // Aquí viaja la cotización actualizada (Escenario B)
                });
            }

            // 3. Si fue exitoso (Escenario A)
            return res.status(200).json({ // 200 OK
                success: true,
                message: 'cotizacion confirmada correctamente',
                data: data.data 
            });

        } catch (error) {
            console.log(`Error en confirmCotization Controller: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de confirmar la cotización',
                error: error,
                success: false
            });
        }
    },

    async cancelCotization(req, res, next) {
        try {
            const id = req.params.id;
            console.log(`[cancelCotization] Intentando cancelar Cotización ID: ${id}`);

            // Llamamos a la nueva función del modelo
            const data = await Order.cancel(id);

            // El modelo nos devolverá un objeto con el estado
            if (!data.success) {
                console.warn(`[cancelCotization] Advertencia: ${data.message}`);
                return res.status(data.statusCode || 400).json({
                    success: false,
                    message: data.message
                });
            }

            console.log(`[cancelCotization] Éxito: ${data.message}`);
            return res.status(200).json({
                success: true,
                message: 'cotizacion cancelada con exito',
                data: data.data
            });

        } catch (error) {
            console.error(`[cancelCotization] Error fatal: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error en el servidor al cancelar la cotización',
                error: error.message
            });
        }
    },
    
}


