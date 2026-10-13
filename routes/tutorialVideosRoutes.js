// routes/tutorialVideosRoutes.js
//
// NUEVO — ver controllers/tutorialVideosController.js.
const passport = require('passport');
const tutorialVideosController = require('../controllers/tutorialVideosController.js');

module.exports = (app) => {
    const auth = passport.authenticate('jwt', { session: false });
    app.get('/api/tutorial-videos', auth, tutorialVideosController.getAll);
    app.put('/api/tutorial-videos', auth, tutorialVideosController.update);
};
