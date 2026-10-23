// routes/reviewRoutes.js
const reviewController = require('../controllers/reviewController');
const passport = require('passport');

module.exports = (app, upload) => {
    app.get('/api/reviews/getByCompany/:id', reviewController.getByCompany);
    app.get('/api/reviews/hasReviewedOrder/:id_order', reviewController.hasReviewedOrder);
    app.post(
        '/api/reviews/create',
        passport.authenticate('jwt', { session: false }),
        upload.fields([{ name: 'photo', maxCount: 1 }]),
        reviewController.create
    );
};
