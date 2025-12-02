const nutritionController = require('../controllers/nutritionController');
const passport = require('passport');

module.exports = (app,upload) => {
    app.post('/api/nutrition/log', passport.authenticate('jwt', {session: false}), nutritionController.logFood);
    app.get('/api/nutrition/today/:id_client', passport.authenticate('jwt', {session: false}), nutritionController.getDailyLog);

        // --- NUEVAS RUTAS ---
    // Metas
    app.post('/api/nutrition/goals', passport.authenticate('jwt', {session: false}), nutritionController.setGoals);
    app.get('/api/nutrition/goals/:id_client', passport.authenticate('jwt', {session: false}), nutritionController.getGoals);
    
    // Borrar Log
    app.delete('/api/nutrition/log/:id', passport.authenticate('jwt', {session: false}), nutritionController.deleteLog);
    app.post('/api/nutrition/analyze-meal', passport.authenticate('jwt', {session: false}), upload.single('image'), nutritionController.analyzeMealAI);
}
