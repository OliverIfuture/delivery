// routes/myRoutinesRoutes.js
//
// NUEVO — ver controllers/myRoutinesController.js.
const passport = require('passport');
const myRoutinesController = require('../controllers/myRoutinesController.js');

module.exports = (app) => {
    const auth = passport.authenticate('jwt', { session: false });

    app.get('/api/my-routines/templates', auth, myRoutinesController.getMyTemplates);
    app.get('/api/my-routines/client/:id_client', auth, myRoutinesController.getClientRoutines);
    app.put('/api/my-routines/update', auth, myRoutinesController.updateMyRoutine);
    app.delete('/api/my-routines/delete/:id', auth, myRoutinesController.deleteMyRoutine);
    app.post('/api/my-routines/apply-template', auth, myRoutinesController.applyTemplateToClient);

    app.get('/api/my-routines/folders', auth, myRoutinesController.getMyFolders);
    app.post('/api/my-routines/folders/create', auth, myRoutinesController.createMyFolder);
    app.put('/api/my-routines/folders/rename', auth, myRoutinesController.renameMyFolder);
    app.put('/api/my-routines/move', auth, myRoutinesController.moveMyNode);
    app.delete('/api/my-routines/folders/delete/:id', auth, myRoutinesController.deleteMyFolder);
};
