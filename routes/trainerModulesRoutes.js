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

    // 'video' + 'cover' opcional (portada capturada de un frame del video,
    // ver trainerModulesController.js) — upload.fields en vez de
    // upload.array porque ahora pueden venir dos archivos de dos campos
    // distintos a la vez.
    const lessonUpload = upload.fields([{ name: 'video', maxCount: 1 }, { name: 'cover', maxCount: 1 }]);
    app.post('/api/trainer-modules/lessons/create', auth, lessonUpload, trainerModulesController.createMyLesson);
    app.put('/api/trainer-modules/lessons/update', auth, lessonUpload, trainerModulesController.updateMyLesson);
    app.delete('/api/trainer-modules/lessons/delete/:id', auth, trainerModulesController.deleteMyLesson);
};
