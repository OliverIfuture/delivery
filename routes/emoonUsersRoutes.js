// routes/emoonUsersRoutes.js
const emoonUsersController = require('../controllers/emoonUsersController');
const passport = require('passport');

module.exports = (app, upload) => {

    // ==========================================================
    // RUTAS PÚBLICAS (No requieren token)
    // ==========================================================
    app.post('/api/emoon/users/create', emoonUsersController.register);
    app.post('/api/emoon/users/login', emoonUsersController.login);

    // ==========================================================
    // RUTAS PRIVADAS (Requieren el token 'emoon-jwt')
    // ==========================================================

    // GET: /api/emoon/users/all
    app.get(
        '/api/emoon/users/all',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonUsersController.getAll
    );

};