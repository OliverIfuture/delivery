const flexAssistantController = require('../controllers/flexAssistantController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/flex — asistente de IA real del entrenador (ver
    // controllers/flexAssistantController.js).
    app.post('/api/flex/chat', passport.authenticate('jwt', { session: false }), flexAssistantController.chat);

};
