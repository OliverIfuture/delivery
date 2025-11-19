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
    // Usada para crear un nuevo ejercicio con imagen
    // (Coincide con ExerciseProvider.create)
app.post('/api/exercises/create', 
        passport.authenticate('jwt', { session: false }), 
        upload.array('image', 1), // <--- 'image' debe coincidir con Flutter
        exercisesController.create
    );
    

    // --- RUTAS PUT ---
    // (Aquí irán las rutas para actualizar, ej: updateWithImage, update)

    // --- RUTAS DELETE ---
    // (Aquí irá la ruta para eliminar)
        // RUTA PARA ELIMINAR UN EJERCICIO
    app.delete(
        '/api/exercises/delete/:id', 
        passport.authenticate('jwt', { session: false }), 
        exercisesController.delete
    );

}
