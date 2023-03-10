const passport = require('passport');
const categoriesController = require('../controllers/categoriesController');

module.exports = (app) => {

        /* 
    *GET ROUTES
   */
    app.get('/api/categories/getAll', passport.authenticate('jwt', { session: false }), categoriesController.getAll);

    /* 
    *POST ROUTES
   */
    app.post('/api/categories/create', passport.authenticate('jwt', { session: false }), categoriesController.create);

}