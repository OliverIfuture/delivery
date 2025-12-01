const nutritionController = require('../controllers/nutritionController');
const passport = require('passport');

module.exports = (app) => {
    app.post('/api/nutrition/log', passport.authenticate('jwt', {session: false}), nutritionController.logFood);
    app.get('/api/nutrition/today/:id_client', passport.authenticate('jwt', {session: false}), nutritionController.getDailyLog);
}
