// routes/selfClientRoutes.js
//
// NUEVO — ver controllers/selfClientController.js.
const passport = require('passport');
const selfClientController = require('../controllers/selfClientController.js');

module.exports = (app) => {
    const auth = passport.authenticate('jwt', { session: false });

    app.get('/api/self-client/ensure', auth, selfClientController.ensureMine);
};
