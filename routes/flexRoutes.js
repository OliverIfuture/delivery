const flexAssistantController = require('../controllers/flexAssistantController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/flex — asistente de IA real del entrenador (ver
    // controllers/flexAssistantController.js).
    app.post('/api/flex/chat', passport.authenticate('jwt', { session: false }), flexAssistantController.chat);
    // NUEVO — genera un plan de entrenamiento real (ver AiTrainingPlanModal.vue).
    // Responde rápido con un jobId (la generación real corre en segundo
    // plano — ver comentario en el controller) — el frontend hace polling
    // al segundo endpoint hasta que el job quede listo.
    app.post('/api/flex/generate-training-plan', passport.authenticate('jwt', { session: false }), flexAssistantController.generateTrainingPlan);
    app.get('/api/flex/generate-training-plan/:jobId', passport.authenticate('jwt', { session: false }), flexAssistantController.getTrainingPlanJob);

};
