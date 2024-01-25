const passport = require('passport');
const productsControllers = require('../controllers/productsControllers');

module.exports = (app, upload) => {
      app.post('/api/products/create',passport.authenticate('jwt', {session: false}) , upload.array('image', 3), productsControllers.create);
      app.post('/api/products/createPLate',passport.authenticate('jwt', {session: false}) , upload.array('image', 3), productsControllers.createPLate);
      app.post('/api/products/createTab',passport.authenticate('jwt', {session: false}) , upload.array('image', 3), productsControllers.createTab);
      app.post('/api/products/createGift',passport.authenticate('jwt', {session: false}) , productsControllers.createGift);

      app.get('/api/products/getAll',passport.authenticate('jwt', {session: false}) , productsControllers.getAll);     
      app.get('/api/products/getAllStocks/:id_company',passport.authenticate('jwt', {session: false}) , productsControllers.getAllStocks);
      app.get('/api/products/findMyProduct/:name',passport.authenticate('jwt', {session: false}) , productsControllers.findMyProduct);
      app.get('/api/products/getAllCompany',passport.authenticate('jwt', {session: false}) , productsControllers.getAllCompany);     
      app.get('/api/products/getGift',passport.authenticate('jwt', {session: false}) , productsControllers.getGift);     
      app.get('/api/products/getGifts',passport.authenticate('jwt', {session: false}) , productsControllers.getGifts);     

      app.post('/api/products/setStock', passport.authenticate('jwt', { session: false }), productsControllers.setStock);
      app.post('/api/products/setFavorites/:id_plate/:id_user', productsControllers.setFavorites);
      app.post('/api/products/findFavorites/:id_plate/:id_user',productsControllers.findFavorites);

      app.get('/api/products/findByCategory/:id_category',passport.authenticate('jwt', {session: false}) , productsControllers.findByCategory);
      app.get('/api/products/getByCtaegoryPlate/:id_category',passport.authenticate('jwt', {session: false}) , productsControllers.getByCtaegoryPlate);
      app.get('/api/products/findByCategoryStocks/:id_category/:id_company',passport.authenticate('jwt', {session: false}) , productsControllers.findByCategoryStocks);

      app.get('/api/products/findByCategoryAndProductName/:id_category/:product_name', passport.authenticate('jwt', {session: false}), productsControllers.findByCategoryAndProductName);
       app.get('/api/products/getByCtaegoryAndProductNamePlate/:id_category/:product_name', passport.authenticate('jwt', {session: false}), productsControllers.getByCtaegoryAndProductNamePlate);
      app.get('/api/products/findByCategoryAndProductNameStocks/:id_category/:product_name/:id_company', passport.authenticate('jwt', {session: false}), productsControllers.findByCategoryAndProductNameStocks);

      app.put('/api/products/updateStock', productsControllers.updateProduct);
      app.put('/api/products/update', productsControllers.upateProduct);
      app.put('/api/products/updateAdmin', productsControllers.updateAdmin);
      app.put('/api/products/turnOff', productsControllers.turnOff);
      app.put('/api/products/turnOn/:id', productsControllers.turnOn);

      app.put('/api/products/updateStockers/:id_product/:stock/:id_company', productsControllers.updateStockers);

      app.delete('/api/products/deleteProduct/:id', passport.authenticate('jwt', { session: false }), productsControllers.delete);
      app.delete('/api/products/deleteSale/:id', passport.authenticate('jwt', { session: false }), productsControllers.deleteSale);


}
