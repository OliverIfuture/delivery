// routes/emoonReviewsRoutes.js
const reviewsController = require('../controllers/emoonReviewsController');
const passport = require('passport');

module.exports = (app) => {
    app.get('/api/emoon/reviews', passport.authenticate('emoon-jwt', { session: false }), reviewsController.getAll);
    app.post('/api/emoon/reviews', passport.authenticate('emoon-jwt', { session: false }), reviewsController.create);
    app.put('/api/emoon/reviews/:id/toggle', passport.authenticate('emoon-jwt', { session: false }), reviewsController.togglePublish);
};