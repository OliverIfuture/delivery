const calendarEventsController = require('../controllers/calendarEventsController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/calendar-events — agenda real del entrenador.

    app.get('/api/calendar-events', passport.authenticate('jwt', { session: false }), calendarEventsController.list);
    // El propio cliente leyendo su calendario desde la app.
    app.get('/api/calendar-events/mine', passport.authenticate('jwt', { session: false }), calendarEventsController.listMine);
    app.post('/api/calendar-events', passport.authenticate('jwt', { session: false }), calendarEventsController.create);
    app.put('/api/calendar-events/:id', passport.authenticate('jwt', { session: false }), calendarEventsController.update);
    app.put('/api/calendar-events/:id/shift', passport.authenticate('jwt', { session: false }), calendarEventsController.shift);
    app.delete('/api/calendar-events/:id', passport.authenticate('jwt', { session: false }), calendarEventsController.remove);

};
