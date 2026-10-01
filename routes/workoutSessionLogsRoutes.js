const workoutSessionLogsController = require('../controllers/workoutSessionLogsController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/workout-logs — cómo le fue al cliente al terminar su
    // sesión (dificultad/ánimo/comentarios), ver models/workoutSessionLog.js.
    app.post('/api/workout-logs', passport.authenticate('jwt', { session: false }), workoutSessionLogsController.create);
    app.get('/api/workout-logs/recent', passport.authenticate('jwt', { session: false }), workoutSessionLogsController.listRecent);

};
