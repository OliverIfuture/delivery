// controllers/cobiCheckoutController.js
//
// NUEVO — CRUD del diseño de la pasarela de pago COBI. Ver
// models/cobiCheckout.js para el porqué del JSON único por entrenador.
const CobiCheckout = require('../models/cobiCheckout.js');

module.exports = {

    // Autenticado — el propio entrenador guarda su diseño desde el editor.
    async saveDesign(req, res) {
        try {
            const id_trainer = req.user.id;
            const { design } = req.body;
            if (!design) {
                return res.status(400).json({ success: false, message: 'Falta el diseño.' });
            }
            const result = await CobiCheckout.upsert(id_trainer, design);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.log(`Error en cobiCheckoutController.saveDesign: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al guardar el diseño',
                error: error.message
            });
        }
    },

    // Autenticado — para que el editor cargue lo último guardado al abrir.
    async getMyDesign(req, res) {
        try {
            const id_trainer = req.user.id;
            const row = await CobiCheckout.getByTrainer(id_trainer);
            return res.status(200).json({ success: true, data: row ? row.design : null });
        } catch (error) {
            console.log(`Error en cobiCheckoutController.getMyDesign: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener el diseño',
                error: error.message
            });
        }
    },

    // PÚBLICO, sin login — la página de pago que abre el cliente desde el
    // enlace del entrenador necesita leer esto sin estar autenticada.
    async getPublicDesign(req, res) {
        try {
            const id_trainer = req.params.id_trainer;
            const row = await CobiCheckout.getByTrainer(id_trainer);
            return res.status(200).json({ success: true, data: row ? row.design : null });
        } catch (error) {
            console.log(`Error en cobiCheckoutController.getPublicDesign: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener el diseño',
                error: error.message
            });
        }
    }

};
