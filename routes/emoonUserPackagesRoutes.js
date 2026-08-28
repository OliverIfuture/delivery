// routes/emoonUserPackagesRoutes.js
const userPackagesController = require('../controllers/emoonUserPackagesController');
const passport = require('passport');

module.exports = (app) => {
    // Consultar paquete activo con créditos vigentes
    app.get(
        '/api/emoon/user-packages/active/:userId',
        passport.authenticate('emoon-jwt', { session: false }),
        userPackagesController.getActive
    );

    // Consultar historial de paquetes adquiridos por el cliente
    app.get(
        '/api/emoon/user-packages/user/:userId',
        passport.authenticate('emoon-jwt', { session: false }),
        userPackagesController.getByUserId
    );
};