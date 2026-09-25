// routes/nutritionCatalogRoutes.js
//
// NUEVO — ver controllers/nutritionCatalogController.js.
const passport = require('passport');
const nutritionCatalogController = require('../controllers/nutritionCatalogController.js');

module.exports = (app, upload) => {
    const auth = passport.authenticate('jwt', { session: false });

    app.get('/api/nutrition-catalog/ingredients', auth, nutritionCatalogController.getMyIngredients);
    app.post('/api/nutrition-catalog/ingredients/create', auth, upload.array('image', 1), nutritionCatalogController.createMyIngredient);
    app.put('/api/nutrition-catalog/ingredients/update', auth, upload.array('image', 1), nutritionCatalogController.updateMyIngredient);
    app.delete('/api/nutrition-catalog/ingredients/delete/:id', auth, nutritionCatalogController.deleteMyIngredient);

    app.get('/api/nutrition-catalog/recipes', auth, nutritionCatalogController.getMyRecipes);
    app.post('/api/nutrition-catalog/recipes/create', auth, upload.array('image', 1), nutritionCatalogController.createMyRecipe);
    app.put('/api/nutrition-catalog/recipes/update', auth, upload.array('image', 1), nutritionCatalogController.updateMyRecipe);
    app.delete('/api/nutrition-catalog/recipes/delete/:id', auth, nutritionCatalogController.deleteMyRecipe);

    app.get('/api/nutrition-catalog/supplements', auth, nutritionCatalogController.getMySupplements);
    app.post('/api/nutrition-catalog/supplements/create', auth, upload.array('image', 1), nutritionCatalogController.createMySupplement);
    app.put('/api/nutrition-catalog/supplements/update', auth, upload.array('image', 1), nutritionCatalogController.updateMySupplement);
    app.delete('/api/nutrition-catalog/supplements/delete/:id', auth, nutritionCatalogController.deleteMySupplement);
};
