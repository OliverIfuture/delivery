const passport = require('passport');
const productsControllers = require('../controllers/productsControllers');

module.exports = (app, upload) => {
      app.post('/api/products/create',passport.authenticate('jwt', {session: false}) , upload.array('image', 3), productsControllers.create);
      app.post('/api/products/createTab',passport.authenticate('jwt', {session: false}) , upload.array('image', 3), productsControllers.createTab);
      app.get('/api/products/getAll',passport.authenticate('jwt', {session: false}) , productsControllers.getAll);
      app.post('/api/products/setStock', passport.authenticate('jwt', { session: false }), productsControllers.setStock);

      app.get('/api/products/findByCategory/:id_category',passport.authenticate('jwt', {session: false}) , productsControllers.findByCategory);
      app.get('/api/products/findByCategoryAndProductName/:id_category/:product_name', passport.authenticate('jwt', {session: false}), productsControllers.findByCategoryAndProductName);
      app.put('/api/products/updateStock', productsControllers.updateProduct);
      app.put('/api/products/update', productsControllers.upateProduct);

      app.delete('/api/products/deleteProduct/:id', passport.authenticate('jwt', { session: false }), productsControllers.delete);
      app.delete('/api/products/deleteSale/:id', passport.authenticate('jwt', { session: false }), productsControllers.deleteSale);


}
