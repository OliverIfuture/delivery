// routes/nutritionPlanRoutes.js
//
// NUEVO — ver controllers/nutritionPlanController.js.
const passport = require('passport');
const nutritionPlanController = require('../controllers/nutritionPlanController.js');

module.exports = (app) => {
    const auth = passport.authenticate('jwt', { session: false });

    app.get('/api/nutrition-plans/client/:id_client', auth, nutritionPlanController.getMyClientPlans);
    app.post('/api/nutrition-plans/create', auth, nutritionPlanController.createPlan);
    app.put('/api/nutrition-plans/update', auth, nutritionPlanController.updatePlan);
    app.delete('/api/nutrition-plans/delete/:id', auth, nutritionPlanController.deletePlan);
};
