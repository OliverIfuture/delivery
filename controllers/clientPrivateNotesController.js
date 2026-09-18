// controllers/clientPrivateNotesController.js
//
// NUEVO — CRUD de notas privadas del entrenador sobre un cliente. Ver el
// detalle completo en models/clientPrivateNotes.js.
const ClientPrivateNote = require('../models/clientPrivateNotes.js');

module.exports = {

    async list(req, res) {
        try {
            const id_client = req.params.id_client;
            const id_company = req.user.mi_store;
            const notes = await ClientPrivateNote.getByClient(id_client, id_company);
            return res.status(200).json({ success: true, data: notes });
        } catch (error) {
            console.log(`Error en clientPrivateNotesController.list: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener las notas',
                error: error.message
            });
        }
    },

    async create(req, res) {
        try {
            const { id_client, content, color } = req.body;
            const id_company = req.user.mi_store;
            if (!id_client || !content || !content.trim()) {
                return res.status(400).json({ success: false, message: 'Falta id_client o content.' });
            }
            const note = await ClientPrivateNote.create(id_client, id_company, content.trim(), color);
            return res.status(201).json({ success: true, data: note });
        } catch (error) {
            console.log(`Error en clientPrivateNotesController.create: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al crear la nota',
                error: error.message
            });
        }
    },

    async update(req, res) {
        try {
            const id_note = req.params.id_note;
            const id_company = req.user.mi_store;
            const { content, color, pinned } = req.body;
            const note = await ClientPrivateNote.update(id_note, id_company, { content, color, pinned });
            if (!note) {
                return res.status(404).json({ success: false, message: 'Nota no encontrada.' });
            }
            return res.status(200).json({ success: true, data: note });
        } catch (error) {
            console.log(`Error en clientPrivateNotesController.update: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al actualizar la nota',
                error: error.message
            });
        }
    },

    async remove(req, res) {
        try {
            const id_note = req.params.id_note;
            const id_company = req.user.mi_store;
            const result = await ClientPrivateNote.remove(id_note, id_company);
            if (!result.rowCount) {
                return res.status(404).json({ success: false, message: 'Nota no encontrada.' });
            }
            return res.status(200).json({ success: true, message: 'Nota eliminada.' });
        } catch (error) {
            console.log(`Error en clientPrivateNotesController.remove: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al eliminar la nota',
                error: error.message
            });
        }
    }

};
