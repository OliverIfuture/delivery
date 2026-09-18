const clientProgressController = require('../controllers/clientProgressController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/progress

    // --- GET ---
    // Obtener todos los logs de métricas (peso, etc.) de un cliente
    app.get('/api/progress/metrics/:id_client', passport.authenticate('jwt', { session: false }), clientProgressController.getMetrics);

    // Obtener todas las fotos de progreso de un cliente
    app.get('/api/progress/photos/:id_client', passport.authenticate('jwt', { session: false }), clientProgressController.getPhotos);
    // Obtener la fecha de la última foto subida (Cuestionario o App)
    app.get(
        '/api/progress/lastPhotoDate/:id_client',
        passport.authenticate('jwt', { session: false }),
        clientProgressController.getLastPhotoDate
    );
    // --- POST ---
    // Guardar un nuevo log de métricas (peso, cintura, etc.)
    app.post('/api/progress/logMetric', passport.authenticate('jwt', { session: false }), clientProgressController.logMetric);

    // Guardar la URL de una foto de progreso (después de subirla a Firebase)
    app.post('/api/progress/logPhoto', passport.authenticate('jwt', { session: false }), clientProgressController.logPhoto);
    app.post('/api/progress/logPhotoUserApp', passport.authenticate('jwt', { session: false }), clientProgressController.logPhotoUserApp);
    app.get('/api/progress/photosApp/:id_client', passport.authenticate('jwt', { session: false }), clientProgressController.getPhotosApp);
    app.post(
        '/api/progress/analyze-ai',
        passport.authenticate('jwt', { session: false }),
        clientProgressController.analyzeProgressAI
    );

    // NUEVO — CRUD de métricas corporales completas (catálogo de ~27
    // métricas, no solo peso/%grasa/cintura), para que el ENTRENADOR
    // registre/edite/borre a nombre de un cliente. Ver controllers/
    // clientProgressController.js y models/clientProgress.js.
    app.post('/api/progress/fullMetric', passport.authenticate('jwt', { session: false }), clientProgressController.upsertFullMetric);
    app.get('/api/progress/fullMetrics/:id_client', passport.authenticate('jwt', { session: false }), clientProgressController.getFullMetrics);
    app.put('/api/progress/fullMetric/:log_id', passport.authenticate('jwt', { session: false }), clientProgressController.updateFullMetric);
    app.delete('/api/progress/fullMetric/:log_id', passport.authenticate('jwt', { session: false }), clientProgressController.deleteFullMetric);

};
