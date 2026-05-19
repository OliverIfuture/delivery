const passport = require('passport');
const exercisesController = require('../controllers/exercisesController');

module.exports = (app, upload) => {

    // --- RUTAS GET ---
    // Usada para obtener la biblioteca completa de un entrenador
    // (Coincide con ExerciseProvider.getByCompany)
    app.get(
        '/api/exercises/findByCompany/:id_company',
        passport.authenticate('jwt', { session: false }),
        exercisesController.findByCompany
    );

    // NUEVA RUTA
    app.get('/api/exercises/getGlobal', passport.authenticate('jwt', { session: false }), exercisesController.getGlobal);


    // --- RUTAS POST ---
    // Asegúrate de importar 'upload' (tu middleware de Multer)
    app.post('/api/exercises/create',
        passport.authenticate('jwt', { session: false }),
        // 🔥 CAMBIO CLAVE: Usamos fields en lugar de array para recibir ambos archivos
        upload.fields([
            { name: 'image', maxCount: 1 },
            { name: 'video', maxCount: 1 }
        ]),
        exercisesController.create
    );

    // --- RUTAS PUT ---
    // RUTA PARA ACTUALIZAR (Asegúrate de tener importado 'upload')
    app.put('/api/exercises/update',
        passport.authenticate('jwt', { session: false }),
        upload.fields([
            { name: 'image', maxCount: 1 },
            { name: 'video', maxCount: 1 }
        ]),
        exercisesController.update
    );
    // --- RUTAS DELETE ---
    // (Aquí irá la ruta para eliminar)
    // RUTA PARA ELIMINAR UN EJERCICIO
    app.delete(
        '/api/exercises/delete/:id',
        passport.authenticate('jwt', { session: false }),
        exercisesController.delete
    );

}
