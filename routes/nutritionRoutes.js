const nutritionController = require('../controllers/nutritionController');
const passport = require('passport');

// --- 1. AGREGAR ESTAS LÍNEAS DE CONFIGURACIÓN ---
const multer = require('multer');
const storage = multer.memoryStorage(); // Guardar en memoria RAM para enviar rápido a Gemini
const upload = multer({ storage: storage });
// -----------------------------------------------

module.exports = (app) => {
    
    // Rutas existentes (Logs y Metas)
    app.post('/api/nutrition/log', passport.authenticate('jwt', {session: false}), nutritionController.logFood);
    app.get('/api/nutrition/today/:id_client', passport.authenticate('jwt', {session: false}), nutritionController.getDailyLog);

    app.post('/api/nutrition/goals', passport.authenticate('jwt', {session: false}), nutritionController.setGoals);
    app.get('/api/nutrition/goals/:id_client', passport.authenticate('jwt', {session: false}), nutritionController.getGoals);
    
    app.delete('/api/nutrition/log/:id', passport.authenticate('jwt', {session: false}), nutritionController.deleteLog);

    // --- RUTA DE ANÁLISIS DE IMAGEN (CORREGIDA) ---
    // Ahora 'upload' sí existe y funcionará
    app.post(
        '/api/nutrition/analyze-meal', 
        passport.authenticate('jwt', {session: false}), 
        upload.single('image'), // <--- Aquí estaba el error
        nutritionController.analyzeMealAI
    );
}
