// routes/photoGalleryRoutes.js
//
// NUEVO — ver controllers/photoGalleryController.js.
const passport = require('passport');
const photoGalleryController = require('../controllers/photoGalleryController.js');

module.exports = (app, upload) => {
    const auth = passport.authenticate('jwt', { session: false });

    app.get('/api/photo-gallery/mine', auth, photoGalleryController.getMyPhotos);
    app.post('/api/photo-gallery/upload', auth, upload.array('photo', 1), photoGalleryController.uploadMyPhoto);
    app.delete('/api/photo-gallery/delete/:id', auth, photoGalleryController.deleteMyPhoto);
};
