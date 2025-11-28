const UsersController = require('../controllers/usersController.js');
const passport = require('passport');
module.exports = (app, upload) => {
    app.get('/api/users/getAll', UsersController.getAll);
    app.get('/api/users/getAllDealer', UsersController.getAllDealer);
    app.get('/api/users/findByState/:state', UsersController.findByState);
    app.get('/api/users/findByMail/:email',UsersController.findByMail);

    app.get('/api/users/findById/:id',passport.authenticate('jwt', {session: false}) ,UsersController.findById);
    app.get('/api/users/findDeliveryMen/:id',passport.authenticate('jwt', {session: false}) ,UsersController.findDeliveryMan);
    app.get('/api/users/selectToken/:id',UsersController.selectToken);
    app.get('/api/users/selectTokenByCompany/:id',UsersController.selectTokenByCompany);
    app.get('/api/users/getAdminsNotificationTokens/:id', passport.authenticate('jwt', {session: false}), UsersController.getAdminsNotificationTokens);
    app.get('/api/users/getUsersMultiNotificationTokens', passport.authenticate('jwt', {session: false}), UsersController.getUsersMultiNotificationTokens);

    app.get('/api/users/getShops/:employed',passport.authenticate('jwt', {session: false}) ,UsersController.getShops);
    app.get('/api/users/findClient/:name',passport.authenticate('jwt', {session: false}) ,UsersController.findClient);

    app.get('/api/users/findByCode/:code/:id',UsersController.findByCode);

    app.post('/api/users/createWithImageDelivery', upload.array('image', 1), UsersController.createWithImageDelivery);
    app.post('/api/users/filesuploadPdf/:pathName', upload.array('imageFile', 1), UsersController.filesuploadPdf);
    app.post('/api/users/filesupload/:pathName', upload.array('imageFile', 1), UsersController.filesupload);

    app.post('/api/users/create', upload.array('image', 1), UsersController.registerWithImage);
    app.post('/api/users/registerWithOutImage', UsersController.registerWithOutImage);

    app.post('/api/users/createticket/:name/:active/:amount/:userId', UsersController.createticket);
    app.post('/api/users/login', UsersController.login);
    app.post('/api/users/loginQr', UsersController.loginQr);

    app.post('/api/users/logout', UsersController.logout);

    //actualizar datos
    app.put('/api/users/update', upload.array('image', 1),passport.authenticate('jwt', {session: false}) , UsersController.update);
    app.put('/api/users/updateNoImage', upload.array('image', 1),passport.authenticate('jwt', {session: false}) , UsersController.updateNoImage);
    app.put('/api/users/updateTrainer', upload.array('document', 1),passport.authenticate('jwt', {session: false}) , UsersController.updateTrainer);
    app.put('/api/users/updateAccountQr', upload.array('document', 1),passport.authenticate('jwt', {session: false}) , UsersController.updateAccountQr);
    app.put('/api/users/updateState', UsersController.updateState);
    app.put('/api/users/updateStateFail', UsersController.updateStateFail);
    app.put('/api/users/updateNotificationToken', UsersController.updateNotificationToken);    
    app.put('/api/users/forgotPass/:email/:password', UsersController.forgotPass);
    app.put('/api/users/updatePoints/:id/:puntos', UsersController.updatePoints);
    app.put('/api/users/updateCompanyPromo/:idCompany/:status', passport.authenticate('jwt', {session: false}),  UsersController.updateCompanyPromo);

    //eliminacion de datos para
    app.delete('/api/users/deleteAccout/:idUser', UsersController.deleteAccout);
    app.delete('/api/users/deleteDiscountCode/:id', UsersController.deleteDiscountCode);


    /// dealer
     app.post('/api/users/create_dealer', UsersController.register_dealer);
     app.post('/api/users/login_dealer', UsersController.login_dealer);
     app.get('/api/users/findByUserIdPhone/:id',passport.authenticate('dealer-jwt', {session: false}) ,UsersController.findByUserIdPhone);
     app.get('/api/users/findById_dealer/:id', passport.authenticate('dealer-jwt', { session: false }), UsersController.findById_dealer);
     app.put('/api/users/updateNotificationToken_dealer', UsersController.updateNotificationToken_dealer);    
     app.get('/api/users/selectToken_dealer/:id', passport.authenticate('dealer-jwt', { session: false }),UsersController.selectToken_dealer);

     app.get('/api/users/findClientdealer/:name',passport.authenticate('dealer-jwt', {session: false}) ,UsersController.findClientDealer);
     app.get('/api/users/getAdminsNotificationTokensDealer', passport.authenticate('dealer-jwt', {session: false}), UsersController.getAdminsNotificationTokensDealer);
     app.get('/api/users/getCompanyById/:id',passport.authenticate('jwt', {session: false}) ,UsersController.getCompanyById);
     app.get('/api/users/getAllCompanies', passport.authenticate('jwt', {session: false}), UsersController.getAllCompanies);
     app.get('/api/users/getMembershipPlan', passport.authenticate('jwt', {session: false}), UsersController.getMembershipPlan);
     app.put('/api/users/renewMembership', UsersController.renewMembership);
     app.put('/api/users/updateCompanyStatus/:companyId/:newStatus', UsersController.updateCompanyStatus);
     app.put('/api/users/updateCompanyPaymentMethods', UsersController.updateCompanyPaymentMethods);
     app.put('/api/users/updateStripeKeys/:companyId/:publishableKey/:secretKey', UsersController.updateStripeKeys);
     app.put('/api/users/updateCompanyDetails', UsersController.updateCompanyDetails);
     app.put('/api/users/extendMembership/:companyId/:monthsToAdd', UsersController.extendMembership);
     app.get('/api/users/getByRole/:id',passport.authenticate('jwt', {session: false}) ,UsersController.getByRole);
     app.get('/api/users/getAgoraConfig',passport.authenticate('jwt', {session: false}) ,UsersController.getAgoraConfig);
     app.get('/api/users/getAgoraConfigall',passport.authenticate('jwt', {session: false}) ,UsersController.getAgoraConfigall);
     app.put('/api/users/updateAgoraConfig', UsersController.updateAgoraConfig);
     app.put('/api/users/chageState/:id', UsersController.chageState);
    app.post('/api/users/createDiscountCode', UsersController.createDiscountCode);
     app.get('/api/users/getDiscountCodesByCompany/:id',passport.authenticate('jwt', {session: false}) ,UsersController.getDiscountCodesByCompany);

    
     app.post('/api/users/createWholesaleUser', UsersController.createWholesaleUser);
     app.get('/api/users/getWholesaleUsersByCompany/:id',passport.authenticate('jwt', {session: false}) ,UsersController.getWholesaleUsersByCompany);
     app.get('/api/users/getClientsByCompany/:id_company', UsersController.getClientsByCompany);
    app.post('/api/users/inviteClient', passport.authenticate('jwt', { session: false }), UsersController.inviteClient);
    app.get('/api/users/getAvailableTrainers', passport.authenticate('jwt', { session: false }), UsersController.getAvailableTrainers);
    
    
    app.post('/api/users/createWithImageUserAndCompany', upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'imageLogo', maxCount: 1 },
        { name: 'imageCard', maxCount: 1 } // <-- ¡NUEVO CAMPO AÑADIDO!
    ]), UsersController.createWithImageUserAndCompany);

    app.get(
        '/api/users/generateAccessQr', 
        passport.authenticate('jwt', { session: false }), 
        UsersController.generateAccessQr
    );
}   

