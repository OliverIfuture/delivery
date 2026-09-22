const activityController = require('../controllers/activityController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/activity — feed real de "Actividad" del entrenador.

    app.get('/api/activity/feed', passport.authenticate('jwt', { session: false }), activityController.getFeed);

};
