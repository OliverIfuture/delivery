// routes/emoonUsersRoutes.js
const emoonUsersController = require('../controllers/emoonUsersController');
const passport = require('passport');

module.exports = (app, upload) => {

    // ==========================================================
    // RUTAS PÚBLICAS (No requieren token)
    // ==========================================================
    app.post('/api/emoon/users/create', emoonUsersController.register);
    app.post('/api/emoon/users/login', emoonUsersController.login);
    app.post('/api/emoon/users/password-reset/send-otp', emoonUsersController.sendPasswordResetOtp);
    app.post('/api/emoon/users/password-reset/verify-otp', emoonUsersController.verifyPasswordResetOtp);
    app.post('/api/emoon/users/password-reset/reset', emoonUsersController.resetPassword);

    // ==========================================================
    // RUTAS PRIVADAS (Requieren el token 'emoon-jwt')
    // ==========================================================

    // GET: /api/emoon/users/all
    app.get(
        '/api/emoon/users/all',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonUsersController.getAll
    );

    app.put(
        '/api/emoon/users/update',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonUsersController.update
    );
    app.put(
        '/api/emoon/users/updateRole',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonUsersController.updateRole
    );
    app.delete(
        '/api/emoon/users/delete/:id',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonUsersController.deleteUser
    );

};