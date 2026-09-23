const coachCommunityController = require('../controllers/coachCommunityController.js');
const passport = require('passport');

module.exports = (app, upload) => {

    // PREFIJO: /api/coach-community — comunidad exclusiva entre
    // entrenadores (ver controllers/coachCommunityController.js). Dar
    // like/comentar/votar/reportar/fijar reutiliza DIRECTO los endpoints ya
    // existentes de /api/community — no dependen de id_company, así que no
    // hace falta duplicarlos aquí.

    app.get('/api/coach-community/feed', passport.authenticate('jwt', { session: false }), coachCommunityController.getFeed);
    app.post('/api/coach-community/post', passport.authenticate('jwt', { session: false }), upload.array('image', 10), coachCommunityController.createPost);
    app.delete('/api/coach-community/post/:id_post', passport.authenticate('jwt', { session: false }), coachCommunityController.deletePost);
    // NUEVO — ranking de entrenadores por número de clientes (semana/mes/siempre).
    app.get('/api/coach-community/leaderboard/:period', passport.authenticate('jwt', { session: false }), coachCommunityController.getLeaderboard);

};
