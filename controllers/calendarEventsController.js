// controllers/calendarEventsController.js
//
// NUEVO — CRUD de la agenda real del entrenador. Ver detalle completo en
// models/calendarEvent.js. Todo escenario queda acotado por
// req.user.mi_store (la compañía del entrenador logueado), nunca por un
// id que venga del cliente.
const CalendarEvent = require('../models/calendarEvent.js');

module.exports = {

    async list(req, res) {
        try {
            const id_company = req.user.mi_store;
            const events = await CalendarEvent.getByCompany(id_company);
            return res.status(200).json({ success: true, data: events });
        } catch (error) {
            console.log(`Error en calendarEventsController.list: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener los eventos del calendario',
                error: error.message
            });
        }
    },

    async create(req, res) {
        try {
            const id_company = req.user.mi_store;
            const { title, start_at, end_at } = req.body;
            if (!title || !start_at || !end_at) {
                return res.status(400).json({ success: false, message: 'Faltan title, start_at o end_at.' });
            }
            const event = await CalendarEvent.create(id_company, req.body);
            return res.status(201).json({ success: true, data: event });
        } catch (error) {
            console.log(`Error en calendarEventsController.create: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al crear el evento',
                error: error.message
            });
        }
    },

    async update(req, res) {
        try {
            const id_company = req.user.mi_store;
            const id = req.params.id;
            const event = await CalendarEvent.update(id, id_company, req.body);
            if (!event) {
                return res.status(404).json({ success: false, message: 'Evento no encontrado.' });
            }
            return res.status(200).json({ success: true, data: event });
        } catch (error) {
            console.log(`Error en calendarEventsController.update: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al actualizar el evento',
                error: error.message
            });
        }
    },

    async shift(req, res) {
        try {
            const id_company = req.user.mi_store;
            const id = req.params.id;
            const { deltaMs } = req.body;
            if (deltaMs === undefined) {
                return res.status(400).json({ success: false, message: 'Falta deltaMs.' });
            }
            const event = await CalendarEvent.shift(id, id_company, deltaMs);
            if (!event) {
                return res.status(404).json({ success: false, message: 'Evento no encontrado.' });
            }
            return res.status(200).json({ success: true, data: event });
        } catch (error) {
            console.log(`Error en calendarEventsController.shift: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al mover el evento',
                error: error.message
            });
        }
    },

    async remove(req, res) {
        try {
            const id_company = req.user.mi_store;
            const id = req.params.id;
            const result = await CalendarEvent.remove(id, id_company);
            if (!result.rowCount) {
                return res.status(404).json({ success: false, message: 'Evento no encontrado.' });
            }
            return res.status(200).json({ success: true, message: 'Evento eliminado.' });
        } catch (error) {
            console.log(`Error en calendarEventsController.remove: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al eliminar el evento',
                error: error.message
            });
        }
    }

};
