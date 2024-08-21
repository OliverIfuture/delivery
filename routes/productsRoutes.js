const passport = require('passport');
const productsControllers = require('../controllers/productsControllers');

module.exports = (app, upload) => {
      app.post('/api/products/createPost/:id_user/:description', upload.array('image', 1), productsControllers.createPost);
      app.post('/api/products/create',passport.authenticate('jwt', {session: false}) , upload.array('image', 3), productsControllers.create);
      app.post('/api/products/createPLate',passport.authenticate('jwt', {session: false}) , upload.array('image', 3), productsControllers.createPLate);
      app.post('/api/products/createTab',passport.authenticate('jwt', {session: false}) , upload.array('image', 3), productsControllers.createTab);
      app.post('/api/products/createGift',passport.authenticate('jwt', {session: false}) , productsControllers.createGift);
      app.post('/api/products/createReview',passport.authenticate('jwt', {session: false}) , productsControllers.createReview);
      app.post('/api/products/createReviewProduct',passport.authenticate('jwt', {session: false}) , productsControllers.createReviewProduct);

      app.post('/api/products/createComent',passport.authenticate('jwt', {session: false}) , productsControllers.createComent);
      
      app.post('/api/products/createLike/:id_plate/:username/:useremail/:id_user' , productsControllers.createLike);
      app.post('/api/products/createLikeProduct/:id_plate/:username/:useremail/:id_user' , productsControllers.createLikeProduct);

      app.post('/api/products/likePublish/:id_publish/:username/:useremail/:id_user' , productsControllers.likePublish);
      app.post('/api/products/createLikePost/:id_publish/:username/:useremail/:id_user' , productsControllers.createLikePost);
      app.post('/api/products/createLikeComent/:id_coment/:username/:useremail/:id_user' , productsControllers.createLikeComent);
      
      app.post('/api/products/createLikeAnswerComent/:id_answer/:username/:useremail/:id_user' , productsControllers.createLikeAnswerComent);
      app.post('/api/products/createLikeAnswer/:id_answer/:username/:useremail/:id_user' , productsControllers.createLikeAnswer);
      app.post('/api/products/createLikeAnswerProduct/:id_answer/:username/:useremail/:id_user' , productsControllers.createLikeAnswerProduct);

      
      app.post('/api/products/createAnswer/:id_review/:username/:answer/:responseto/:id_user' , productsControllers.createAnswer);
      app.post('/api/products/createAnswerProduct/:id_review/:username/:answer/:responseto/:id_user' , productsControllers.createAnswerProduct);

      app.post('/api/products/createAnswerPost/:id_coment/:username/:answer/:responseto/:id_user' , productsControllers.createAnswerPost);

      app.get('/api/products/getAll', productsControllers.getAll);     
      app.get('/api/products/findLast5', productsControllers.findLast5);    
      app.get('/api/products/getIngredients/:id_plate', productsControllers.getIngredients);    
      app.get('/api/products/getExtras/:id_plate', productsControllers.getExtras);    

      app.get('/api/products/populars', productsControllers.populars);    
      app.get('/api/products/getGiftsProducts', productsControllers.getGiftsProducts);    
      app.get('/api/products/findServings', productsControllers.findServings);    

      app.get('/api/products/getPost/:id_user', productsControllers.getPost);    
      app.get('/api/products/getPostAll', productsControllers.getPostAll);    

      app.get('/api/products/findReview/:id', productsControllers.findReview);    
      app.get('/api/products/findReviewProduct/:id', productsControllers.findReviewProduct);    

      app.get('/api/products/findPostComent/:id', productsControllers.findPostComent);    
      
      app.get('/api/products/favoritesplates/:id', productsControllers.favoritesplates);    
      app.get('/api/products/favoritesplatesProducts/:id', productsControllers.favoritesplatesProducts);    

      app.get('/api/products/lookFavoritesList/:id_profile', productsControllers.lookFavoritesList);    
      app.get('/api/products/lookFollowersList/:id_profile', productsControllers.lookFollowersList );    

      app.get('/api/products/getAnswers/:id', productsControllers.getAnswers);    
      app.get('/api/products/getAnswersProducts/:id', productsControllers.getAnswersProducts);    

      app.get('/api/products/getAnswersPost/:id', productsControllers.getAnswersPost);    
      
      app.get('/api/products/findLikes/:id_plate', productsControllers.findLikes);    
      app.get('/api/products/findLikesComent/:id_post', productsControllers.findLikesComent);    

      app.get('/api/products/getAllStocks/:id_company',passport.authenticate('jwt', {session: false}) , productsControllers.getAllStocks);
      app.get('/api/products/findMyProduct/:name',passport.authenticate('jwt', {session: false}) , productsControllers.findMyProduct);
      app.get('/api/products/getAllCompany',passport.authenticate('jwt', {session: false}) , productsControllers.getAllCompany);     
      app.get('/api/products/getGift',passport.authenticate('jwt', {session: false}) , productsControllers.getGift);     
      app.get('/api/products/getGifts',passport.authenticate('jwt', {session: false}) , productsControllers.getGifts);     

      app.post('/api/products/setStock', passport.authenticate('jwt', { session: false }), productsControllers.setStock);
      app.post('/api/products/setFavorites/:id_plate/:id_user', productsControllers.setFavorites);
      app.post('/api/products/setFavoritesProducts/:id_plate/:id_user', productsControllers.setFavoritesProducts);

      app.post('/api/products/setFavoritesProfile/:id_profile/:id_user', productsControllers.setFavoritesProfile);
      app.post('/api/products/setFollowersProfile/:id_profile/:id_user', productsControllers.setFollowersProfile);
      
      app.post('/api/products/setSave/:id_plate/:id_user', productsControllers.setSave);
      app.post('/api/products/findFavorites/:id_plate/:id_user',productsControllers.findFavorites);
      app.post('/api/products/findFavoritesProduct/:id_plate/:id_user',productsControllers.findFavoritesProduct);

      app.post('/api/products/findFavoritesProfile/:id_profile/:id_user',productsControllers.findFavoritesProfile);
      app.post('/api/products/findFollowersProfile/:id_profile/:id_user',productsControllers.findFollowersProfile);
      
      
      app.post('/api/products/findSaves/:id_plate/:id_user',productsControllers.findSaves);

      app.get('/api/products/getTickets/:userId',productsControllers.getTickets);

      app.get('/api/products/getFavorites/:id_user',productsControllers.getFavorites);
      app.get('/api/products/getUserProfile/:id',productsControllers.getUserProfile);
      
      app.get('/api/products/getSaves/:id_user',productsControllers.getSaves);
      app.get('/api/products/getReviewPlateFavoriteIcon/:id_plate',productsControllers.getReviewPlateFavoriteIcon);
      app.get('/api/products/getReviewPlateFavoriteIconProduct/:id_plate',productsControllers.getReviewPlateFavoriteIconProduct);

      app.get('/api/products/getReviewPlateRate/:id_plate',productsControllers.getReviewPlateRate);
      app.get('/api/products/getProfileFavoriteIconSum/:id_profile',productsControllers.getProfileFavoriteIconSum);
      app.get('/api/products/getProfilePlatesIconSumProfile/:id_profile',productsControllers.getProfilePlatesIconSumProfile);
      app.get('/api/products/GgetProfileFollowersIconSumProfile/:id_profile',productsControllers.GgetProfileFollowersIconSumProfile);
      app.get('/api/products/findByCategory/:id_category', productsControllers.findByCategory);
      app.get('/api/products/getByCtaegoryPlate/:id_category',passport.authenticate('jwt', {session: false}) , productsControllers.getByCtaegoryPlate);
      app.get('/api/products/findByCategoryStocks/:id_category/:id_company',passport.authenticate('jwt', {session: false}) , productsControllers.findByCategoryStocks);

      app.get('/api/products/findByCategoryAndProductName/:id_category/:product_name', productsControllers.findByCategoryAndProductName);
      app.get('/api/products/getByCtaegoryAndProductNameSearch/:product_name', productsControllers.getByCtaegoryAndProductNameSearch);

       app.get('/api/products/getByCtaegoryAndProductNamePlate/:id_category/:product_name', passport.authenticate('jwt', {session: false}), productsControllers.getByCtaegoryAndProductNamePlate);
      app.get('/api/products/findByCategoryAndProductNameStocks/:id_category/:product_name/:id_company', passport.authenticate('jwt', {session: false}), productsControllers.findByCategoryAndProductNameStocks);

      app.put('/api/products/updateStock', productsControllers.updateProduct);
      app.put('/api/products/update', productsControllers.upateProduct);
      app.put('/api/products/updateAdmin', productsControllers.updateAdmin);
      app.put('/api/products/turnOff', productsControllers.turnOff);
      app.put('/api/products/turnOn/:id', productsControllers.turnOn);

      app.put('/api/products/updateStockers/:id_product/:stock/:id_company', productsControllers.updateStockers);

      app.delete('/api/products/deleteAnswerLike/:id', passport.authenticate('jwt', { session: false }), productsControllers.deleteAnswerLike );
      app.delete('/api/products/deleteAnswerLikeProduct/:id', passport.authenticate('jwt', { session: false }), productsControllers.deleteAnswerLikeProduct);

      
      app.delete('/api/products/deleteAnswerLikeComent/:id', passport.authenticate('jwt', { session: false }), productsControllers.deleteAnswerLikeComent);

      app.delete('/api/products/deleteLikeComment/:id', passport.authenticate('jwt', { session: false }), productsControllers.deleteLikeComment );
      app.delete('/api/products/deleteLikeCommentProduct/:id', passport.authenticate('jwt', { session: false }), productsControllers.deleteLikeCommentProduct);

      
      
      app.delete('/api/products/deleteLikeCommentPost/:id', passport.authenticate('jwt', { session: false }), productsControllers.deleteLikeCommentPost);

      app.delete('/api/products/deleteLikePost/:id', passport.authenticate('jwt', { session: false }), productsControllers.deleteLikePost );
      app.delete('/api/products/deleteProduct/:id', passport.authenticate('jwt', { session: false }), productsControllers.delete);
      app.delete('/api/products/deleteSale/:id', passport.authenticate('jwt', { session: false }), productsControllers.deleteSale);
      app.delete('/api/products/deleteFavorites/:id_plate/:id_user', productsControllers.deleteFavorites);
      app.delete('/api/products/deleteFavoritesProducts/:id_plate/:id_user', productsControllers.deleteFavoritesProducts);

      app.delete('/api/products/deleteFavoritesProfile/:id_profile/:id_user', productsControllers.deleteFavoritesProfile);
      app.delete('/api/products/deleteFollowersProfile/:id_profile/:id_user', productsControllers.deleteFollowersProfile);
      app.delete('/api/products/deletePost/:id', productsControllers.deletePost );

      app.delete('/api/products/deleteteSave/:id_plate/:id_user', productsControllers.deleteteSave);



}
