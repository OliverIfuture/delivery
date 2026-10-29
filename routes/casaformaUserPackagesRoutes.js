// routes/casaformaUserPackagesRoutes.js
const userPackagesController = require('../controllers/casaformaUserPackagesController');
const passport = require('passport');

module.exports = (app) => {
    app.get(
        '/api/casaforma/user-packages/active/:userId',
        passport.authenticate('casaforma-jwt', { session: false }),
        userPackagesController.getActive
    );
};
