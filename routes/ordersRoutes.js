const passport = require('passport');
const ordersController = require('../controllers/ordersController');

module.exports = (app) => {

        /* 
    *GET ROUTES
   */
    app.get('/api/orders/findByStatus/:status', passport.authenticate('jwt', { session: false }), ordersController.findByStatus);
    app.get('/api/orders/findByDeliveryAndStatus/:id_delivery/:status', passport.authenticate('jwt', { session: false }), ordersController.findByDeliveryAndStatus);
    app.get('/api/orders/findByClientAndStatus/:id_client/:status', passport.authenticate('jwt', {session: false}), ordersController.findByClientAndStatus);

    app.get('/api/orders/selectOrder/:date', ordersController.selectOrder);
    app.get('/api/orders/selectOpenShift', ordersController.selectOpenShift);
    app.get('/api/orders/selectOpenShiftExpenses', ordersController.selectOpenShiftExpenses);
    app.get('/api/orders/selectTotals/:shift_ref', ordersController.selectTotals );
    app.get('/api/orders/selectExpenses/:shift_ref', ordersController.selectExpenses );        
    app.get('/api/orders/selectIncomes/:shift_ref', ordersController.selectIncomes );        
    app.get('/api/orders/selectShiftClose', ordersController.selectShiftClose);

    /* 
    *POST ROUTES
   */
    app.post('/api/orders/create', passport.authenticate('jwt', { session: false }), ordersController.create);
    app.post('/api/orders/createCashOrder', passport.authenticate('jwt', { session: false }), ordersController.createCashOrder);
    app.post('/api/orders/createSale', passport.authenticate('jwt', { session: false }), ordersController.createSale);

    app.post('/api/orders/closeShift', passport.authenticate('jwt', { session: false }), ordersController.closeShift);
    app.post('/api/orders/insertDateIncome', passport.authenticate('jwt', { session: false }), ordersController.insertDateIncome);
    app.post('/api/orders/insertDateExpenses', passport.authenticate('jwt', { session: false }), ordersController.insertDateExpenses);

       /* 
    *put ROUTES actualizar
   */
    app.put('/api/orders/updateToDespatched', passport.authenticate('jwt', { session: false }), ordersController.updateToDespatched);
    app.put('/api/orders/updateToOnTheWay', passport.authenticate('jwt', { session: false }), ordersController.updateToOnTheWay);
    app.put('/api/orders/updateToDelivered', passport.authenticate('jwt', {session: false}), ordersController.updateToDelivered);
    app.put('/api/orders/updateLatLng', passport.authenticate('jwt', {session: false}), ordersController.updateLatLng);
    app.put('/api/orders/cancelOrder', passport.authenticate('jwt', { session: false }), ordersController.cancelOrder);
    app.put('/api/orders/closeShiftClose/:id_Close_Shift/:income/:expenses/:change/:total/:total_card/:total_cash', ordersController.closeShiftClose);

    app.delete('/api/orders/deleteExpenses/:id', passport.authenticate('jwt', { session: false }), ordersController.deleteExpenses);
    app.delete('/api/orders/deleteIncomes/:id', passport.authenticate('jwt', { session: false }), ordersController.deleteIncomes);

}
