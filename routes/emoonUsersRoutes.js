const emoonUsersController = require('../controllers/emoonUsersController');
const passport = require('passport');

module.exports = (app, upload) => {

    // ==========================================================
    // RUTAS PÚBLICAS (No requieren token)
    // ==========================================================

    // POST: /api/emoon/users/create
    app.post('/api/emoon/users/create', emoonUsersController.register);


    // ==========================================================
    // RUTAS PRIVADAS (Requerirán el 'emoon-jwt' de Passport)
    // ==========================================================

    // Ejemplo de cómo se verá una ruta protegida en el futuro:
    // app.put('/api/emoon/users/update', passport.authenticate('emoon-jwt', { session: false }), emoonUsersController.update);

};