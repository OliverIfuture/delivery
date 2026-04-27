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

    //////////// COBI ////////////////
    // Obtener todas las sucursales de una empresa en específico
    app.get('/api/locations/findByCompany/:company_id', passport.authenticate('cobi-jwt', { session: false }), addressControllers.findByCompany);

    /* * POST ROUTES
     */
    // Crear una nueva sucursal/ubicación
    app.post('/api/locations/create', passport.authenticate('cobi-jwt', { session: false }), addressControllers.cobicreate);

    /* * PUT ROUTES
     */
    // Marcar una ubicación como la predeterminada (Usa PUT porque estamos actualizando un estado)
    app.put('/api/locations/setDefault', passport.authenticate('cobi-jwt', { session: false }), addressControllers.setDefault);

}
