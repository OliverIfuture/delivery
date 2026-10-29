// routes/casaformaCategoriesRoutes.js
const casaformaCategoriesController = require('../controllers/casaformaCategoriesController');
const passport = require('passport');

module.exports = (app) => {
    app.get('/api/casaforma/categories/all', casaformaCategoriesController.getAll);
    app.post('/api/casaforma/categories/create', passport.authenticate('casaforma-jwt', { session: false }), casaformaCategoriesController.create);
    app.delete('/api/casaforma/categories/delete/:id', passport.authenticate('casaforma-jwt', { session: false }), casaformaCategoriesController.delete);
};
