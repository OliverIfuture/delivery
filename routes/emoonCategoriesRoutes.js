const emoonCategoriesController = require('../controllers/emoonCategoriesController.js');
const passport = require('passport');

module.exports = (app) => {
    app.get('/api/emoon/categories/all', emoonCategoriesController.getAll);
    app.post('/api/emoon/categories/create', passport.authenticate('emoon-jwt', { session: false }), emoonCategoriesController.create);
};