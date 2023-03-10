const UsersController = require('../controllers/usersController.js');
const passport = require('passport');
module.exports = (app, upload) => {
    app.get('/api/users/getAll', UsersController.getAll);
    app.get('/api/users/findById/:id',passport.authenticate('jwt', {session: false}) ,UsersController.findById);
    app.get('/api/users/findDeliveryMen',passport.authenticate('jwt', {session: false}) ,UsersController.findDeliveryMan);

    app.post('/api/users/create', upload.array('image', 1), UsersController.registerWithImage);

    app.post('/api/users/login', UsersController.login);
    app.post('/api/users/logout', UsersController.logout);

    //actualizar datos
    app.put('/api/users/update', upload.array('image', 1),passport.authenticate('jwt', {session: false}) , UsersController.update);
    app.put('/api/users/updateNotificationToken', UsersController.updateNotificationToken);
}   

