// routes/emoonUsersRoutes.js
const emoonUsersController = require('../controllers/emoonUsersController');
const passport = require('passport');

module.exports = (app, upload) => {
    // Rutas Públicas
    app.post('/api/emoon/users/create', emoonUsersController.register);

    // NUEVA RUTA
    app.post('/api/emoon/users/login', emoonUsersController.login);
};