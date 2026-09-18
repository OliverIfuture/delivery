const clientPrivateNotesController = require('../controllers/clientPrivateNotesController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/notes — notas privadas del entrenador sobre un cliente.

    app.get('/api/notes/client/:id_client', passport.authenticate('jwt', { session: false }), clientPrivateNotesController.list);
    app.post('/api/notes', passport.authenticate('jwt', { session: false }), clientPrivateNotesController.create);
    app.put('/api/notes/:id_note', passport.authenticate('jwt', { session: false }), clientPrivateNotesController.update);
    app.delete('/api/notes/:id_note', passport.authenticate('jwt', { session: false }), clientPrivateNotesController.remove);

};
