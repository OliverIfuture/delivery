// controllers/calendarEventsController.js
//
// NUEVO — CRUD de la agenda real del entrenador. Ver detalle completo en
// models/calendarEvent.js. Todo escenario queda acotado por
// req.user.mi_store (la compañía del entrenador logueado), nunca por un
// id que venga del cliente.
const CalendarEvent = require('../models/calendarEvent.js');

// Traduce los 2 errores de Postgres que de verdad se ven en uso real (ver
// investigación del bug "a veces no se guardan los eventos" — se probaron
// ~100 combinaciones reales contra producción): el mensaje crudo de
// Postgres no le dice nada al entrenador en el front.
//   23503 = foreign_key_violation (id_client ya no existe — cliente
//           borrado mientras el formulario seguía abierto/cacheado).
//   22001 = string_data_right_truncation (title/location pasan de 255).
function friendlyCalendarError(error) {
    if (error.code === '23503') {
        return 'El cliente que seleccionaste ya no existe (puede que lo hayas eliminado). Quita la selección de cliente e intenta de nuevo.';
    }
    if (error.code === '22001') {
        return 'El título o la ubicación son demasiado largos (máximo 255 caracteres).';
    }
    return null;
}

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

    // NUEVO — el propio cliente leyendo su calendario desde la app
    // (req.user.id, nunca un id que venga del cliente en la URL).
    async listMine(req, res) {
        try {
            const id_client = req.user.id;
            const events = await CalendarEvent.getByClient(id_client);
            return res.status(200).json({ success: true, data: events });
        } catch (error) {
            console.log(`Error en calendarEventsController.listMine: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener tu calendario',
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
            const friendly = friendlyCalendarError(error);
            // Si hay mensaje amigable, NO se manda además el error crudo de
            // Postgres — el front (httpClient.js) concatena message+error
            // cuando ambos vienen, y eso le mostraría igual el SQL crudo
            // al entrenador.
            return res.status(friendly ? 400 : 501).json({
                success: false,
                message: friendly || 'Error al crear el evento',
                error: friendly ? undefined : error.message
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
            const friendly = friendlyCalendarError(error);
            return res.status(friendly ? 400 : 501).json({
                success: false,
                message: friendly || 'Error al actualizar el evento',
                error: friendly ? undefined : error.message
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
