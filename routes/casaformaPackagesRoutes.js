// routes/casaformaPackagesRoutes.js
const casaformaPackagesController = require('../controllers/casaformaPackagesController');
const passport = require('passport');

module.exports = (app) => {
    app.get('/api/casaforma/packages/all', casaformaPackagesController.getAll);
    app.post('/api/casaforma/packages/create', passport.authenticate('casaforma-jwt', { session: false }), casaformaPackagesController.create);
    app.put('/api/casaforma/packages/update/:id', passport.authenticate('casaforma-jwt', { session: false }), casaformaPackagesController.update);
    app.delete('/api/casaforma/packages/delete/:id', passport.authenticate('casaforma-jwt', { session: false }), casaformaPackagesController.deletePackage);
};
