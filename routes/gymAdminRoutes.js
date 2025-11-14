const gymAdminController = require('../controllers/gymAdminController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/gym/admin

    // --- GET ---
    
    app.get('/api/gym/admin/stats', passport.authenticate('jwt', { session: false }), gymAdminController.getStats);

    app.get('/api/gym/admin/access-logs/today', passport.authenticate('jwt', { session: false }), gymAdminController.getTodayAccessLogs);

};
