const gymController = require('../controllers/gymController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/gym

    // --- RUTAS DE ACCESO (G1 - G3) ---
    app.get('/api/gym/generate-access-token', passport.authenticate('jwt', { session: false }), gymController.generateAccessToken);
    app.post('/api/gym/check-in', passport.authenticate('jwt', { session: false }), gymController.checkInWithToken);
    app.get('/api/gym/get-membership-status/:id_client', passport.authenticate('jwt', { session: false }), gymController.getMembershipStatus);
    
    // --- RUTAS DE GESTIÓN DE MEMBRESÍAS (G4 - POS) ---
    
    // Venta de membresía (la usará el POS)
    app.post('/api/gym/create-membership', passport.authenticate('jwt', { session: false }), gymController.createMembership);

    // --- **NUEVAS RUTAS: CRUD PARA DEFINIR LOS PLANES** ---
    
    // (Admin) Obtener la lista de planes (para el POS)
    app.get('/api/gym/plans', passport.authenticate('jwt', { session: false }), gymController.getMembershipPlans);

    // (Admin) Crear un nuevo plan
    app.post('/api/gym/plans/create', passport.authenticate('jwt', { session: false }), gymController.createMembershipPlan);

    // (Admin) Actualizar un plan
    app.put('/api/gym/plans/update', passport.authenticate('jwt', { session: false }), gymController.updateMembershipPlan);
    
    // (Admin) Eliminar un plan
    app.delete('/api/gym/plans/delete/:id', passport.authenticate('jwt', { session: false }), gymController.deleteMembershipPlan);

}const gymController = require('../controllers/gymController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/gym

    // --- RUTAS DE ACCESO (G1 - G3) ---
    app.get('/api/gym/generate-access-token', passport.authenticate('jwt', { session: false }), gymController.generateAccessToken);
    app.post('/api/gym/check-in', passport.authenticate('jwt', { session: false }), gymController.checkInWithToken);
    app.get('/api/gym/get-membership-status/:id_client', passport.authenticate('jwt', { session: false }), gymController.getMembershipStatus);
    
    // --- RUTAS DE GESTIÓN DE MEMBRESÍAS (G4 - POS) ---
    
    // Venta de membresía (la usará el POS)
    app.post('/api/gym/create-membership', passport.authenticate('jwt', { session: false }), gymController.createMembership);

    // --- **NUEVAS RUTAS: CRUD PARA DEFINIR LOS PLANES** ---
    
    // (Admin) Obtener la lista de planes (para el POS)
    app.get('/api/gym/plans', passport.authenticate('jwt', { session: false }), gymController.getMembershipPlans);

    // (Admin) Crear un nuevo plan
    app.post('/api/gym/plans/create', passport.authenticate('jwt', { session: false }), gymController.createMembershipPlan);

    // (Admin) Actualizar un plan
    app.put('/api/gym/plans/update', passport.authenticate('jwt', { session: false }), gymController.updateMembershipPlan);
    
    // (Admin) Eliminar un plan
    app.delete('/api/gym/plans/delete/:id', passport.authenticate('jwt', { session: false }), gymController.deleteMembershipPlan);

}
