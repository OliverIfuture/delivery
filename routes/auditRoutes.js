// routes/auditRoutes.js
//
// NUEVO — ver controllers/auditController.js. Ambas rutas verifican el
// correo del admin DENTRO del controller (no solo aquí), así que no hay
// forma de llegar a impersonate() sin ser de verdad coach.community.
const auditController = require('../controllers/auditController.js');
const passport = require('passport');

module.exports = (app) => {
    // PREFIJO: /api/audit

    app.get(
        '/api/audit/trainers',
        passport.authenticate('jwt', { session: false }),
        auditController.listTrainers
    );

    app.post(
        '/api/audit/impersonate/:id',
        passport.authenticate('jwt', { session: false }),
        auditController.impersonate
    );
};
