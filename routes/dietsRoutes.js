const dietsController = require('../controllers/dietsController.js');
const passport = require('passport');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
module.exports = (app) => {

    // PREFIJO: /api/diets

    // --- GET ---
    // Obtener todas las dietas asignadas por un entrenador
    app.get('/api/diets/findByTrainer/:id_company', passport.authenticate('jwt', { session: false }), dietsController.findByTrainer);
    // --- NUEVA RUTA PARA LISTA DE COMPRAS ---
    app.post(
        '/api/diets/shopping-list',
        passport.authenticate('jwt', { session: false }),
        dietsController.generateShoppingList
    );
    // Obtener la dieta ACTIVA de un cliente específico (para la app del cliente)
    app.get('/api/diets/findActiveByClient/:id_client', passport.authenticate('jwt', { session: false }), dietsController.findActiveByClient);

    // --- POST ---
    // Asignar una nueva dieta (el 'create')
    app.post('/api/diets/assign', passport.authenticate('jwt', { session: false }), dietsController.assign);

    // --- DELETE ---
    // Eliminar una asignación de dieta
    app.delete('/api/diets/delete/:id', passport.authenticate('jwt', { session: false }), dietsController.delete);

    app.post(
        '/api/diets/analyze',
        passport.authenticate('jwt', { session: false }),
        upload.single('pdf'),
        dietsController.analyzeDietPdf
    );

    // --- ¡ESTA ES LA RUTA QUE FALTA PARA EL POLLING! ---
    app.get(
        '/api/diets/get/:id',
        passport.authenticate('jwt', { session: false }),
        dietsController.getDietById
    );

    app.post('/api/diets/start', passport.authenticate('jwt', { session: false }), upload.array('images', 3), dietsController.startDietAnalysis);

    // Consultar estado (Polling)
    app.get('/api/diets/status/:id', passport.authenticate('jwt', { session: false }), dietsController.checkStatus);

    app.post('/api/diets/generate-data', passport.authenticate('jwt', { session: false }), dietsController.generateDietJSON_NoImages);
    app.post('/api/diets/favorites/toggle', passport.authenticate('jwt', { session: false }), dietsController.toggleFavorite);
    // 2. Subir PDF Final (Sigue igual)
    app.post('/api/diets/upload-pdf', passport.authenticate('jwt', { session: false }), upload.single('pdf'), dietsController.uploadDietPdf);
    // 1. Obtener todas las recetas (Requiere el ID del entrenador/empresa en la URL)
    app.get(
        '/api/diets/recipes/:id_company',
        passport.authenticate('jwt', { session: false }),
        dietsController.getCompanyRecipes
    );

    // 2. Obtener el cuestionario del cliente (Requiere el ID del cliente en la URL)
    app.get('/api/diets/questionnaire/:id_client', dietsController.getClientQuestionnaire
    );

    app.get('/api/diets/getClientQuestionnaireWithEmail/:id_client', dietsController.getClientQuestionnaireWithEmail
    );

    // 3. Asignación múltiple (Post: Los datos van en el Body, no en la URL)
    app.post(
        '/api/diets/assign_multiple',
        passport.authenticate('jwt', { session: false }),
        dietsController.assignMultipleDiets
    );

    // 4. Historial de dietas dinámicas (Requiere el ID del entrenador/empresa en la URL)
    app.get(
        '/api/diets/history/:id_company',
        passport.authenticate('jwt', { session: false }),
        dietsController.getAssignedHistory
    );

    app.get('/api/diets/findByTrainer_v2/:id_company', passport.authenticate('jwt', { session: false }), dietsController.getRecipesWithIngredients);
    app.get('/api/diets/client_v2/:id_client', passport.authenticate('jwt', { session: false }), dietsController.getClientDietV2);
}


