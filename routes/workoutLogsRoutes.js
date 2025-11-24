const workoutLogsController = require('../controllers/workoutLogsController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/workoutlogs

    // --- GET ---
    // Obtener el historial de un cliente para un ejercicio específico
    app.get('/api/workoutlogs/history/:id_client/:exercise_name', passport.authenticate('jwt', { session: false }), workoutLogsController.getHistoryByExercise);
    
    // Obtener todos los logs de una rutina específica
    app.get('/api/workoutlogs/findByRoutine/:id_routine', passport.authenticate('jwt', { session: false }), workoutLogsController.findByRoutine);
    
// **NUEVA RUTA: Obtener TODO el historial de un cliente**
    app.get('/api/workoutlogs/findByClient/:id_client', passport.authenticate('jwt', { session: false }), workoutLogsController.findByClient);

    // --- POST ---
    // Crear un nuevo registro de serie (set)
    app.post('/api/workoutlogs/create', passport.authenticate('jwt', { session: false }), workoutLogsController.create);

    // **NUEVA RUTA: Obtener el feed para el dashboard del entrenador**
    app.get('/api/workoutlogs/feed/:id_company', passport.authenticate('jwt', { session: false }), workoutLogsController.getTrainerFeed);

    app.get(
        '/api/workoutlogs/findLogsForCurrentRoutine/:id_client/:idRoutine', 
        passport.authenticate('jwt', { session: false }), 
        workoutLogsController.findLogsForCurrentRoutine
    );
    
};
