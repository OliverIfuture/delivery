const googleAuthController = require('../controllers/googleAuthController.js');

module.exports = (app) => {

    // PÚBLICO — es un punto de entrada de autenticación, no hay sesión
    // todavía (ver controllers/googleAuthController.js).
    app.post('/api/auth/google', googleAuthController.verify);

};
