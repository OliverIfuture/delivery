// routes/emoonScheduledClassesRoutes.js
const scheduledController = require('../controllers/emoonScheduledClassesController');
const passport = require('passport');

module.exports = (app) => {
    // GET: Obtener todas las clases (público o protegido, lo dejamos protegido para el admin por ahora)
    app.get('/api/emoon/scheduled-classes', scheduledController.getAll);

    // POST: Crear nueva clase en el calendario
    app.post(
        '/api/emoon/scheduled-classes',
        passport.authenticate('emoon-jwt', { session: false }),
        scheduledController.create
    );
};