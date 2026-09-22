// models/calendarEvent.js
//
// NUEVO — Agenda real del entrenador (panel Vue: CalendarioView.vue). Antes
// el calendario solo vivía en memoria del navegador (useCalendarStore.js),
// con una agenda de ejemplo que se perdía al recargar. Esta tabla la
// respalda de verdad: sesiones, revisiones, pagos, clases grupales y
// eventos personales.
//
// OJO — la recurrencia (columna `recurrence`) se guarda como una sola
// regla en el evento base, NO como filas materializadas por ocurrencia —
// el front (expandOccurrences() en useCalendarStore.js) ya sabe expandir
// esa regla virtualmente para el rango visible, así que el backend no
// necesita ninguna lógica de recurrencia, solo guardar/devolver la regla.
const db = require('../config/config.js');

const CalendarEvent = {};

CalendarEvent.create = (id_company, data) => {
    const sql = `
        INSERT INTO calendar_events
            (id_company, id_client, title, calendar_type, start_at, end_at, all_day, location, modality, notes, recurrence, reminder_minutes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
    `;
    return db.one(sql, [
        id_company,
        data.id_client || null,
        data.title,
        data.calendar_type || 'personal',
        data.start_at,
        data.end_at,
        !!data.all_day,
        data.location || null,
        data.modality || 'Presencial',
        data.notes || null,
        data.recurrence || 'none',
        data.reminder_minutes ?? 30
    ]);
};

CalendarEvent.getByCompany = (id_company) => {
    const sql = `
        SELECT * FROM calendar_events
        WHERE id_company = $1
        ORDER BY start_at ASC
    `;
    return db.manyOrNone(sql, [id_company]);
};

// Filtrado también por id_company para que un entrenador no pueda editar
// un evento de otro adivinando el id (mismo patrón que client_private_notes).
CalendarEvent.update = (id, id_company, data) => {
    const sql = `
        UPDATE calendar_events
        SET id_client = COALESCE($3, id_client),
            title = COALESCE($4, title),
            calendar_type = COALESCE($5, calendar_type),
            start_at = COALESCE($6, start_at),
            end_at = COALESCE($7, end_at),
            all_day = COALESCE($8, all_day),
            location = COALESCE($9, location),
            modality = COALESCE($10, modality),
            notes = COALESCE($11, notes),
            recurrence = COALESCE($12, recurrence),
            reminder_minutes = COALESCE($13, reminder_minutes),
            updated_at = NOW()
        WHERE id = $1 AND id_company = $2
        RETURNING *
    `;
    return db.oneOrNone(sql, [
        id,
        id_company,
        data.id_client !== undefined ? data.id_client : null,
        data.title !== undefined ? data.title : null,
        data.calendar_type !== undefined ? data.calendar_type : null,
        data.start_at !== undefined ? data.start_at : null,
        data.end_at !== undefined ? data.end_at : null,
        data.all_day !== undefined ? data.all_day : null,
        data.location !== undefined ? data.location : null,
        data.modality !== undefined ? data.modality : null,
        data.notes !== undefined ? data.notes : null,
        data.recurrence !== undefined ? data.recurrence : null,
        data.reminder_minutes !== undefined ? data.reminder_minutes : null
    ]);
};

// Traslado del evento (arrastrar-y-soltar en la vista de Mes) — desplaza
// start_at/end_at el mismo número de milisegundos, sin tocar el resto.
CalendarEvent.shift = (id, id_company, deltaMs) => {
    const sql = `
        UPDATE calendar_events
        SET start_at = start_at + ($3 || ' milliseconds')::interval,
            end_at = end_at + ($3 || ' milliseconds')::interval,
            updated_at = NOW()
        WHERE id = $1 AND id_company = $2
        RETURNING *
    `;
    return db.oneOrNone(sql, [id, id_company, deltaMs]);
};

CalendarEvent.remove = (id, id_company) => {
    const sql = `DELETE FROM calendar_events WHERE id = $1 AND id_company = $2`;
    return db.result(sql, [id, id_company]);
};

module.exports = CalendarEvent;
