// routes/emoonPackagesRoutes.js
const emoonPackagesController = require('../controllers/emoonPackagesController');
const passport = require('passport');

module.exports = (app) => {
    // GET: Obtener todos (Público)
    app.get('/api/emoon/packages/all', emoonPackagesController.getAll);

    // POST: Crear nuevo paquete (Protegido para Staff/Admins)
    app.post(
        '/api/emoon/packages/create',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonPackagesController.create
    );

    app.put(
        '/api/emoon/packages/update/:id',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonPackagesController.update
    );
    app.delete('/api/emoon/packages/delete/:id', emoonPackagesController.deletePackage);

    
};