const posController = require('../controllers/posController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/pos

    // --- Turnos (Shifts) ---
    app.post('/api/pos/shifts/start', passport.authenticate('jwt', { session: false }), posController.startShift);
    app.put('/api/pos/shifts/close', passport.authenticate('jwt', { session: false }), posController.closeShift);
    app.get('/api/pos/shifts/active', passport.authenticate('jwt', { session: false }), posController.getActiveShift);
    
    // --- Ventas (Sales) ---
    app.post('/api/pos/sale', passport.authenticate('jwt', { session: false }), posController.processSale);
    app.get('/api/pos/shifts/sales', passport.authenticate('jwt', { session: false }), posController.getSalesByShift); // Requiere ?id_shift=X
    app.get('/api/pos/sales/by-shift/:id_shift', passport.authenticate('jwt', { session: false }), posController.getSalesByShift);
    // --- Productos (Products) ---
    app.get('/api/pos/products', passport.authenticate('jwt', { session: false }), posController.getProducts);
    app.post('/api/pos/products/create', passport.authenticate('jwt', { session: false }), posController.createProduct);
    app.put('/api/pos/products/update', passport.authenticate('jwt', { session: false }), posController.updateProduct);
    app.post('/api/pos/generate-day-pass', passport.authenticate('jwt', { session: false }), posController.generateDayPass);
    // (Opcional: delete product, etc.)
}
