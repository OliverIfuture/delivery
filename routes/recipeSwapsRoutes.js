// routes/recipeSwapsRoutes.js — sustitución de ingredientes en recetas (cliente).
const passport = require('passport');
const recipeSwapsController = require('../controllers/recipeSwapsController.js');

module.exports = (app) => {
    const auth = passport.authenticate('jwt', { session: false });
    app.get('/api/recipes/:id/swaps/options', auth, recipeSwapsController.options);
    app.get('/api/recipes/:id/swaps', auth, recipeSwapsController.list);
    app.post('/api/recipes/:id/swaps', auth, recipeSwapsController.save);
    app.delete('/api/recipes/:id/swaps/:ingredientIndex', auth, recipeSwapsController.remove);
};
