const giveawayController = require('../controllers/giveawayController.js');
const passport = require('passport');

module.exports = (app, upload) => {

    // PREFIJO: /api/giveaways — sorteos reales del entrenador (CRUD).

    app.get('/api/giveaways/mine', passport.authenticate('jwt', { session: false }), giveawayController.getMine);
    app.post('/api/giveaways', passport.authenticate('jwt', { session: false }), upload.single('media'), giveawayController.create);
    app.put('/api/giveaways/:id', passport.authenticate('jwt', { session: false }), upload.single('media'), giveawayController.update);
    app.put('/api/giveaways/:id/finish', passport.authenticate('jwt', { session: false }), giveawayController.finish);
    app.delete('/api/giveaways/:id', passport.authenticate('jwt', { session: false }), giveawayController.remove);

};
