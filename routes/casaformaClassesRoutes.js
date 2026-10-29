// routes/casaformaClassesRoutes.js
const casaformaClassesController = require('../controllers/casaformaClassesController');
const passport = require('passport');

module.exports = (app) => {
    app.get('/api/casaforma/classes/all', casaformaClassesController.getAll);
    app.post('/api/casaforma/classes/create', passport.authenticate('casaforma-jwt', { session: false }), casaformaClassesController.create);
    app.put('/api/casaforma/classes/update/:id', passport.authenticate('casaforma-jwt', { session: false }), casaformaClassesController.update);
    app.delete('/api/casaforma/classes/delete/:id', passport.authenticate('casaforma-jwt', { session: false }), casaformaClassesController.delete);
};
