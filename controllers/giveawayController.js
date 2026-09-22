// controllers/giveawayController.js
// NUEVO — CRUD real de sorteos, siempre acotado a req.user.mi_store (la
// compañía del entrenador logueado) — ver nota en models/giveaway.js.
const Giveaway = require('../models/giveaway.js');
const storage = require('../utils/cloud_storage.js');

module.exports = {

    async getMine(req, res) {
        try {
            const id_entrenador = req.user.mi_store;
            if (!id_entrenador) {
                return res.status(400).json({ success: false, message: 'Tu cuenta no tiene una compañía asignada.' });
            }
            const data = await Giveaway.getAllByTrainer(id_entrenador);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.log(`Error en giveawayController.getMine: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener tus sorteos', error: error.message });
        }
    },

    async create(req, res) {
        try {
            const id_entrenador = req.user.mi_store;
            if (!id_entrenador) {
                return res.status(400).json({ success: false, message: 'Tu cuenta no tiene una compañía asignada.' });
            }
            const { title, description, prize, min_level, end_date } = req.body;
            if (!title || !end_date) {
                return res.status(400).json({ success: false, message: 'Falta title o end_date.' });
            }

            let media_url = null;
            if (req.file) {
                media_url = await storage(req.file, `giveaway_${Date.now()}`);
            }

            const created = await Giveaway.create(id_entrenador, {
                title, description, prize, media_url,
                min_level: min_level ? Number(min_level) : 1,
                end_date
            });
            return res.status(201).json({ success: true, data: created });
        } catch (error) {
            console.log(`Error en giveawayController.create: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al publicar el sorteo', error: error.message });
        }
    },

    async update(req, res) {
        try {
            const id_entrenador = req.user.mi_store;
            const id = req.params.id;
            const { title, description, prize, min_level, end_date } = req.body;

            let media_url;
            if (req.file) {
                media_url = await storage(req.file, `giveaway_${Date.now()}`);
            }

            const updated = await Giveaway.update(id, id_entrenador, {
                title, description, prize, media_url,
                min_level: min_level !== undefined ? Number(min_level) : undefined,
                end_date
            });
            if (!updated) {
                return res.status(404).json({ success: false, message: 'Sorteo no encontrado.' });
            }
            return res.status(200).json({ success: true, data: updated });
        } catch (error) {
            console.log(`Error en giveawayController.update: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al actualizar el sorteo', error: error.message });
        }
    },

    async finish(req, res) {
        try {
            const id_entrenador = req.user.mi_store;
            const id = req.params.id;
            const { winner_name } = req.body;
            const updated = await Giveaway.finish(id, id_entrenador, winner_name);
            if (!updated) {
                return res.status(404).json({ success: false, message: 'Sorteo no encontrado.' });
            }
            return res.status(200).json({ success: true, data: updated });
        } catch (error) {
            console.log(`Error en giveawayController.finish: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al finalizar el sorteo', error: error.message });
        }
    },

    async remove(req, res) {
        try {
            const id_entrenador = req.user.mi_store;
            const id = req.params.id;
            const result = await Giveaway.remove(id, id_entrenador);
            if (!result.rowCount) {
                return res.status(404).json({ success: false, message: 'Sorteo no encontrado.' });
            }
            return res.status(200).json({ success: true, message: 'Sorteo eliminado.' });
        } catch (error) {
            console.log(`Error en giveawayController.remove: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al eliminar el sorteo', error: error.message });
        }
    }

};
