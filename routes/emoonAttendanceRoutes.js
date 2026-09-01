const emoonAttendanceController = require('../controllers/emoonAttendanceController');
const passport = require('passport');

module.exports = (app) => {
    app.get('/api/emoon/attendance/today', passport.authenticate('emoon-jwt', { session: false }), emoonAttendanceController.getClassesByDate);
    app.put('/api/emoon/attendance/toggle', passport.authenticate('emoon-jwt', { session: false }), emoonAttendanceController.toggleCheckIn);
};