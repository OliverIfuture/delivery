// routes/casaformaAttendanceRoutes.js
const casaformaAttendanceController = require('../controllers/casaformaAttendanceController');
const passport = require('passport');

module.exports = (app) => {
    app.get('/api/casaforma/attendance/today', passport.authenticate('casaforma-jwt', { session: false }), casaformaAttendanceController.getClassesByDate);
    app.put('/api/casaforma/attendance/toggle', passport.authenticate('casaforma-jwt', { session: false }), casaformaAttendanceController.toggleCheckIn);
};
