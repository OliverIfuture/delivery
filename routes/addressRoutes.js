const passport = require('passport');
const addressController = require('../controllers/addressController');
const addressControllers = require('../controllers/addressController');
const { findByUser } = require('../models/addres');

module.exports = (app) => {

        /* 
    *GET ROUTES
   */
    app.get('/api/address/findByUser/:id_user', passport.authenticate('jwt', { session: false }), addressController.findByUser);
    app.get('/api/address/findPromoByGym/:id_company', passport.authenticate('dealer-jwt', { session: false }), addressController.findPromoByGym);

    /* 
    *POST ROUTES
   */
    app.post('/api/address/create', passport.authenticate('jwt', { session: false }), addressControllers.create);
        
        
    app.delete('/api/address/delete/:id/:id_user', passport.authenticate('jwt', { session: false }), addressControllers.delete);

}
