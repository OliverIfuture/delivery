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

            const data = await Order.findByStatus(status);
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

            let order = req.body;
            order.status = 'ENTREGADO';
            await Order.update(order);


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
                error: error
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

    async create(req, res, next) {
        
        try {

            const id_plate = req.params.id_plate;
            const extra = req.params.extra;
            const price = req.params.extra;
            
            let order = req.body;
            order.status = 'PAGADO';
            const data = await Order.create(order, id_plate, extra, price);
            ////recorrer todos los productos de la orden
            for (const product of order.products) {
                if (product.id < 10000) {
                    await OrderHasProducts.create(data.id, product.id, product.quantity);
                    await OrderHasProducts.createOrderWithPlate(data.id, product.id, product.quantity);

                }
                if (product.id > 10000) {
                    await OrderHasProducts.createOrderWithPlate(data.id, product.id, product.quantity);
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
                error: error
            });
        }
    },


    async createCashOrder(req, res, next) {
        try {

            let order = req.body;
            console.log(`orden creada: ${JSON.stringify(order)}`);

            
            order.status = 'PENDIENTE DE PAGO';
            const data = await Order.create(order);

            for (const product of order.products) {
                if (product.id < 1000) {
                    await OrderHasProducts.create(data.id, product.id, product.quantity);
                    await OrderHasProducts.createOrderWithPlate(data.id, product.id, product.quantity);

                }
                if (product.id > 1000) {
                    await OrderHasProducts.createOrderWithPlate(data.id, product.id, product.quantity);
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
                error: error
            });
        }
    },

    async createSale(req, res, next) {
        try {

            let sales = req.body;
            const data = await Order.createSale(sales);

            ////recorrer todos los productos de la orden
            for (const product of sales.products) {
                console.log(`aqui entran los productos ${JSON.stringify(sales)}`);
                await OrderHasProducts.createSale(product.name, product.price, product.image1, product.price_buy, sales.reference, product.quantity, sales.shift_ref);


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
  
}


