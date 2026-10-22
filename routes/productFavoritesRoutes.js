// routes/productFavoritesRoutes.js
const productFavoritesController = require('../controllers/productFavoritesController');
const passport = require('passport');

module.exports = (app) => {
    app.get('/api/product-favorites/mine', passport.authenticate('jwt', { session: false }), productFavoritesController.getMine);
    app.post('/api/product-favorites/toggle', passport.authenticate('jwt', { session: false }), productFavoritesController.toggle);
};
