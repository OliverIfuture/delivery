// routes/casaformaUsersRoutes.js — mismo patrón que routes/emoonUsersRoutes.js
const casaformaUsersController = require('../controllers/casaformaUsersController');
const passport = require('passport');

module.exports = (app) => {

    // ==========================================================
    // RUTAS PÚBLICAS (no requieren token)
    // ==========================================================
    app.post('/api/casaforma/users/create', casaformaUsersController.register);
    app.post('/api/casaforma/users/login', casaformaUsersController.login);
    app.post('/api/casaforma/users/password-reset/send-otp', casaformaUsersController.sendPasswordResetOtp);
    app.post('/api/casaforma/users/password-reset/verify-otp', casaformaUsersController.verifyPasswordResetOtp);
    app.post('/api/casaforma/users/password-reset/reset', casaformaUsersController.resetPassword);

    // ==========================================================
    // RUTAS PRIVADAS (requieren el token 'casaforma-jwt')
    // ==========================================================
    app.get(
        '/api/casaforma/users/all',
        passport.authenticate('casaforma-jwt', { session: false }),
        casaformaUsersController.getAll
    );

    // IMPORTANTE: va después de /all — si fuera antes, Express
    // interpretaría "all" como un :id y nunca llegaría a la ruta de arriba.
    app.get(
        '/api/casaforma/users/:id',
        passport.authenticate('casaforma-jwt', { session: false }),
        casaformaUsersController.getById
    );

    app.put(
        '/api/casaforma/users/update',
        passport.authenticate('casaforma-jwt', { session: false }),
        casaformaUsersController.update
    );

    app.put(
        '/api/casaforma/users/updateRole',
        passport.authenticate('casaforma-jwt', { session: false }),
        casaformaUsersController.updateRole
    );

    app.delete(
        '/api/casaforma/users/delete/:id',
        passport.authenticate('casaforma-jwt', { session: false }),
        casaformaUsersController.deleteUser
    );
};
