const passport = require('passport');
const addressController = require('../controllers/addressController');
const addressControllers = require('../controllers/addressController');
const { findByUser } = require('../models/addres');

module.exports = (app) => {

        /* 
    *GET ROUTES
   */
    app.get('/api/address/findByUser/:id_user', passport.authenticate('jwt', { session: false }), addressController.findByUser);

    /* 
    *POST ROUTES
   */
    app.post('/api/address/create', passport.authenticate('jwt', { session: false }), addressControllers.create);

}