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

    // --- RUTAS POST ---
    // Usada para crear un nuevo ejercicio con imagen
    // (Coincide con ExerciseProvider.create)
    app.post(
        '/api/exercises/create', 
        passport.authenticate('jwt', { session: false }), 
        upload.single('image'), // 'image' debe coincidir con el key en el provider
        exercisesController.create
    );

    // --- RUTAS PUT ---
    // (Aquí irán las rutas para actualizar, ej: updateWithImage, update)

    // --- RUTAS DELETE ---
    // (Aquí irá la ruta para eliminar)

}
