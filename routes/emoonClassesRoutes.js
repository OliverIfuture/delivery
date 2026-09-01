const emoonClassesController = require('../controllers/emoonClassesController');
const passport = require('passport');

module.exports = (app) => {
    app.get('/api/emoon/classes/all', emoonClassesController.getAll);
    app.post('/api/emoon/classes/create', passport.authenticate('emoon-jwt', { session: false }), emoonClassesController.create);
    app.put('/api/emoon/classes/update/:id', passport.authenticate('emoon-jwt', { session: false }), emoonClassesController.update);
    app.delete('/api/emoon/classes/delete/:id', passport.authenticate('emoon-jwt', { session: false }), emoonClassesController.delete);
};