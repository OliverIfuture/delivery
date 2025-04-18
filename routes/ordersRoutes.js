const passport = require('passport');
const ordersController = require('../controllers/ordersController.js');

module.exports = (app) => {

    /* 
*GET ROUTES
*/
    app.get('/api/orders/findByStatus/:status/:id_order_company?', passport.authenticate('jwt', { session: false }), ordersController.findByStatus);
    app.get('/api/orders/findByDeliveryAndStatus/:id_delivery/:status', passport.authenticate('jwt', { session: false }), ordersController.findByDeliveryAndStatus);
    app.get('/api/orders/findByClientAndStatus/:id_client/:status', passport.authenticate('jwt', { session: false }), ordersController.findByClientAndStatus);
        app.get('/api/orders/getByClientAndStatusWeb/:id_client', passport.authenticate('jwt', { session: false }), ordersController.getByClientAndStatusWeb);

    app.get('/api/orders/findByClient/:id_client', passport.authenticate('jwt', { session: false }), ordersController.findByClient);

    app.get('/api/orders/ShiftOrders/:shift_ref', ordersController.ShiftOrders);
    app.get('/api/orders/selectOrderAll/:date', ordersController.selectOrderAll);

    app.get('/api/orders/selectOrder/:date/:shift_ref', ordersController.selectOrder);
    app.get('/api/orders/selectOpenShift/:id_company', ordersController.selectOpenShift);
    app.get('/api/orders/selectOpenShiftExpenses/:id_company', ordersController.selectOpenShiftExpenses);
    app.get('/api/orders/selectTotals/:shift_ref', ordersController.selectTotals);
    app.get('/api/orders/selectExpenses/:shift_ref', ordersController.selectExpenses);
    app.get('/api/orders/selectIncomes/:shift_ref', ordersController.selectIncomes);
    app.get('/api/orders/selectShiftClose', ordersController.selectShiftClose);

    app.get('/api/orders/getNotifications/:userid', ordersController.getNotifications);


    
    /* 
    *POST ROUTES
    create guardadp
    app.post('/api/orders/create/:id_plate/:extra/:price', passport.authenticate('jwt', { session: false }), ordersController.create);

   */
    app.post('/api/orders/createPymentInten/:usertoken/:amount', passport.authenticate('jwt', { session: false }), ordersController.createPymentInten);

    app.post('/api/orders/create', passport.authenticate('jwt', { session: false }), ordersController.create);
    app.post('/api/orders/createCashOrder', passport.authenticate('jwt', { session: false }), ordersController.createCashOrder);
    app.post('/api/orders/createSale', passport.authenticate('jwt', { session: false }), ordersController.createSale);

    app.post('/api/orders/closeShift', passport.authenticate('jwt', { session: false }), ordersController.closeShift);
    app.post('/api/orders/insertDateIncome', passport.authenticate('jwt', { session: false }), ordersController.insertDateIncome);
    app.post('/api/orders/insertDateExpenses', passport.authenticate('jwt', { session: false }), ordersController.insertDateExpenses);


    app.post('/api/orders/createNotification', passport.authenticate('jwt', { session: false }), ordersController.createNotification);

    
    /* 
 *put ROUTES actualizar
*/
    app.put('/api/orders/updateCode/:id/:code', passport.authenticate('jwt', { session: false }), ordersController.updateCode);
    app.put('/api/orders/updateToDespatched', passport.authenticate('jwt', { session: false }), ordersController.updateToDespatched);
    app.put('/api/orders/updateToOnTheWay', passport.authenticate('jwt', { session: false }), ordersController.updateToOnTheWay);
    app.put('/api/orders/updateToDelivered', passport.authenticate('jwt', { session: false }), ordersController.updateToDelivered);
    app.put('/api/orders/updateLatLng', passport.authenticate('jwt', { session: false }), ordersController.updateLatLng);
    app.put('/api/orders/cancelOrder', ordersController.cancelOrder);
    app.put('/api/orders/closeShiftClose/:id_Close_Shift/:income/:expenses/:change/:total/:total_card/:total_cash/:final_cash', ordersController.closeShiftClose);

    app.delete('/api/orders/deleteExpenses/:id', passport.authenticate('jwt', { session: false }), ordersController.deleteExpenses);
    app.delete('/api/orders/deleteIncomes/:id', passport.authenticate('jwt', { session: false }), ordersController.deleteIncomes);

    app.get('/api/orders/findByClientDealer/:id_client/:shift_ref', passport.authenticate('dealer-jwt', { session: false }), ordersController.findByClientDealer);
    app.get('/api/orders/findByClientDealerRecharge/:id_client', passport.authenticate('dealer-jwt', { session: false }), ordersController.findByClientDealerRecharge);
    app.post('/api/orders/createPymentInten2/:usertoken/:amount', passport.authenticate('dealer-jwt', { session: false }), ordersController.createPymentInten);
    app.put('/api/orders/insertRecharge/:id_client/:balance', passport.authenticate('dealer-jwt', { session: false }), ordersController.insertRecharge);
    app.post('/api/orders/createrecharge', passport.authenticate('dealer-jwt', { session: false }), ordersController.createrecharge);
    app.post('/api/orders/createOrdeDealer', passport.authenticate('dealer-jwt', { session: false }), ordersController.createOrdeDealer);


    app.post('/api/orders/createrechargegym', passport.authenticate('dealer-jwt', { session: false }), ordersController.createrechargegym);
    app.get('/api/orders/findByClientDealerRechargeGym/:id_sucursal/:shift_ref', passport.authenticate('dealer-jwt', { session: false }), ordersController.findByClientDealerRechargeGym);
    app.get('/api/orders/getSumShift/:id_sucursal/:shift_ref', passport.authenticate('dealer-jwt', { session: false }), ordersController.getSumShift);
    app.get('/api/orders/getCortes/:id_sucursal/:shift_ref', passport.authenticate('dealer-jwt', { session: false }), ordersController.getCortes);

    app.get('/api/orders/getShiftTurn/:id_sucursal', passport.authenticate('dealer-jwt', { session: false }), ordersController.getShiftTurn);
    app.put('/api/orders/closeShiftGym', passport.authenticate('dealer-jwt', { session: false }), ordersController.closeShiftGym);
    app.post('/api/orders/insertNewTurnGym', passport.authenticate('dealer-jwt', { session: false }), ordersController.insertNewTurnGym);

    app.put('/api/orders/updateToCancelClient/:id', passport.authenticate('dealer-jwt', { session: false }), ordersController.updateToCancelClient);
    app.put('/api/orders/updateToCancelClientToClient/:id/:balance', passport.authenticate('dealer-jwt', { session: false }), ordersController.updateToCancelClientToClient);
    
    
    app.get('/api/orders/getDealers/:sucursalId', passport.authenticate('dealer-jwt', { session: false }), ordersController.getDealers);

    
}
