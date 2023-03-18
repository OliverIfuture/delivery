const passport = require('passport');
const productsControllers = require('../controllers/productsControllers');

module.exports = (app, upload) => {
      app.post('/api/products/create',passport.authenticate('jwt', {session: false}) , upload.array('image', 3), productsControllers.create);
      app.get('/api/products/findByCategory/:id_category',passport.authenticate('jwt', {session: false}) , productsControllers.findByCategory);
      app.get('/api/products/findByCategoryAndProductName/:id_category/:product_name', passport.authenticate('jwt', {session: false}), productsControllers.findByCategoryAndProductName);
      app.put('/api/products/updateStock', productsControllers.updateProduct);
}
