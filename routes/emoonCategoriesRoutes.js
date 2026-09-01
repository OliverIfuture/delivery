const emoonCategoriesController = require('../controllers/emoonCategoriesController');
const passport = require('passport');

module.exports = (app) => {
    app.get('/api/emoon/categories/all', emoonCategoriesController.getAll);
    app.post('/api/emoon/categories/create', passport.authenticate('emoon-jwt', { session: false }), emoonCategoriesController.create);
    app.delete('/api/emoon/categories/delete/:id', passport.authenticate('emoon-jwt', { session: false }), emoonCategoriesController.delete);
};