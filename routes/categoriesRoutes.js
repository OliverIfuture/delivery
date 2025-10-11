const passport = require('passport');
const categoriesController = require('../controllers/categoriesController');

module.exports = (app) => {

        /* 
    *GET ROUTES
   */
    app.get('/api/categories/getAll/:id_category_company?', categoriesController.getAll);
    app.get('/api/categories/getAllByStore/:id_category_company', categoriesController.getAllByStore);

    app.get('/api/categories/getAllPlates', passport.authenticate('jwt', { session: false }), categoriesController.getAllPlates);

    /* 
    *POST ROUTES
   */
    app.post('/api/categories/create', passport.authenticate('jwt', { session: false }), categoriesController.create);

}
