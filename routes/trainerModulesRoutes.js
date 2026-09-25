// routes/trainerModulesRoutes.js
//
// NUEVO — ver controllers/trainerModulesController.js. `upload` es el
// mismo multer compartido que ya usa el resto de la app (server.js).
const passport = require('passport');
const trainerModulesController = require('../controllers/trainerModulesController.js');

module.exports = (app, upload) => {
    const auth = passport.authenticate('jwt', { session: false });

    app.get('/api/trainer-modules/mine', auth, trainerModulesController.getMyModules);
    app.post('/api/trainer-modules/create', auth, upload.array('image', 1), trainerModulesController.createMyModule);
    app.put('/api/trainer-modules/update', auth, upload.array('image', 1), trainerModulesController.updateMyModule);
    app.delete('/api/trainer-modules/delete/:id', auth, trainerModulesController.deleteMyModule);

    app.post('/api/trainer-modules/lessons/create', auth, upload.array('video', 1), trainerModulesController.createMyLesson);
    app.put('/api/trainer-modules/lessons/update', auth, upload.array('video', 1), trainerModulesController.updateMyLesson);
    app.delete('/api/trainer-modules/lessons/delete/:id', auth, trainerModulesController.deleteMyLesson);
};
