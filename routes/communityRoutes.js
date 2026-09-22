const communityController = require('../controllers/communityController.js');
const passport = require('passport');

module.exports = (app, upload) => {

    // PREFIJO: /api/community — feed real del panel del entrenador.

    app.get('/api/community/feed', passport.authenticate('jwt', { session: false }), communityController.getFeed);
    app.post('/api/community/post', passport.authenticate('jwt', { session: false }), upload.array('image', 10), communityController.createPost);
    app.delete('/api/community/post/:id_post', passport.authenticate('jwt', { session: false }), communityController.deletePost);
    app.put('/api/community/post/:id_post/pin', passport.authenticate('jwt', { session: false }), communityController.togglePin);
    app.post('/api/community/post/:id_post/toggle-like', passport.authenticate('jwt', { session: false }), communityController.toggleLike);
    app.get('/api/community/post/:id_post/comments', passport.authenticate('jwt', { session: false }), communityController.getComments);
    app.post('/api/community/comment', passport.authenticate('jwt', { session: false }), communityController.addComment);
    app.post('/api/community/vote', passport.authenticate('jwt', { session: false }), communityController.castVote);
    app.post('/api/community/report', passport.authenticate('jwt', { session: false }), communityController.reportPost);

};
