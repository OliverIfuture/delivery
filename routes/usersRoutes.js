const UsersController = require('../controllers/usersController.js');
const passport = require('passport');
module.exports = (app, upload) => {
    app.get('/api/users/getAll', UsersController.getAll);
    app.get('/api/users/findByState/:state', UsersController.findByState);
    app.get('/api/users/findByMail/:email',UsersController.findByMail);

    app.get('/api/users/findById/:id',passport.authenticate('jwt', {session: false}) ,UsersController.findById);
    app.get('/api/users/findDeliveryMen',passport.authenticate('jwt', {session: false}) ,UsersController.findDeliveryMan);
    app.get('/api/users/selectToken/:id',UsersController.selectToken);
    app.get('/api/users/getAdminsNotificationTokens', passport.authenticate('jwt', {session: false}), UsersController.getAdminsNotificationTokens);
    app.get('/api/users/getUsersMultiNotificationTokens', passport.authenticate('jwt', {session: false}), UsersController.getUsersMultiNotificationTokens);

    app.get('/api/users/getShops/:employed',passport.authenticate('jwt', {session: false}) ,UsersController.getShops);
    app.get('/api/users/findClient/:name',passport.authenticate('jwt', {session: false}) ,UsersController.findClient);

    app.post('/api/users/findByCode/:code',UsersController.findByCode);


    app.post('/api/users/create', upload.array('image', 1), UsersController.registerWithImage);

    app.post('/api/users/login', UsersController.login);
    app.post('/api/users/loginQr', UsersController.loginQr);

    app.post('/api/users/logout', UsersController.logout);

    //actualizar datos
    app.put('/api/users/update', upload.array('image', 1),passport.authenticate('jwt', {session: false}) , UsersController.update);
    app.put('/api/users/updateTrainer', upload.array('document', 1),passport.authenticate('jwt', {session: false}) , UsersController.updateTrainer);
    app.put('/api/users/updateAccountQr', upload.array('document', 1),passport.authenticate('jwt', {session: false}) , UsersController.updateAccountQr);
    app.put('/api/users/updateState', UsersController.updateState);
    app.put('/api/users/updateStateFail', UsersController.updateStateFail);
    app.put('/api/users/updateNotificationToken', UsersController.updateNotificationToken);    
    app.put('/api/users/forgotPass/:email/:password', UsersController.forgotPass);
    app.put('/api/users/updatePoints/:id/:puntos', UsersController.updatePoints);

    //eliminacion de datos para
    app.delete('/api/users/deleteAccout/:id', UsersController.deleteAccout);
}   

