const workoutLogsController = require('../controllers/workoutLogsController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/workoutlogs

    // --- GET ---
    // Obtener el historial de un cliente para un ejercicio específico
    app.get('/api/workoutlogs/history/:id_client/:exercise_name', passport.authenticate('jwt', { session: false }), workoutLogsController.getHistoryByExercise);
    
    // Obtener todos los logs de una rutina específica
    app.get('/api/workoutlogs/findByRoutine/:id_routine', passport.authenticate('jwt', { session: false }), workoutLogsController.findByRoutine);


    // --- POST ---
    // Crear un nuevo registro de serie (set)
    app.post('/api/workoutlogs/create', passport.authenticate('jwt', { session: false }), workoutLogsController.create);
    
};
