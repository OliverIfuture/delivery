// models/clientPrivateNotes.js
//
// NUEVO — Notas privadas del entrenador sobre un cliente (panel Vue). Antes
// esto era un solo textarea que solo vivía en el navegador (se perdía al
// recargar) — esta tabla lo respalda de verdad, permitiendo varias notas
// por cliente (estilo Google Keep: varias tarjetas, colores, fijar una
// arriba), en vez de un solo bloque de texto.
const db = require('../config/config.js');

const ClientPrivateNote = {};

ClientPrivateNote.create = (id_client, id_company, content, color) => {
    const sql = `
        INSERT INTO client_private_notes (id_client, id_company, content, color)
        VALUES ($1, $2, $3, $4)
        RETURNING id, id_client, id_company, content, color, pinned, created_at, updated_at
    `;
    return db.one(sql, [id_client, id_company, content, color || 'default']);
};

// Fijadas primero, luego por última edición — igual que Google Keep.
ClientPrivateNote.getByClient = (id_client, id_company) => {
    const sql = `
        SELECT id, id_client, id_company, content, color, pinned, created_at, updated_at
        FROM client_private_notes
        WHERE id_client = $1 AND id_company = $2
        ORDER BY pinned DESC, updated_at DESC
    `;
    return db.manyOrNone(sql, [id_client, id_company]);
};

// Se filtra también por id_company para que un entrenador no pueda editar
// una nota de otro entrenador adivinando el id.
ClientPrivateNote.update = (id_note, id_company, { content, color, pinned } = {}) => {
    const sql = `
        UPDATE client_private_notes
        SET content = COALESCE($3, content),
            color = COALESCE($4, color),
            pinned = COALESCE($5, pinned),
            updated_at = NOW()
        WHERE id = $1 AND id_company = $2
        RETURNING id, id_client, id_company, content, color, pinned, created_at, updated_at
    `;
    return db.oneOrNone(sql, [
        id_note,
        id_company,
        content !== undefined ? content : null,
        color !== undefined ? color : null,
        pinned !== undefined ? pinned : null
    ]);
};

ClientPrivateNote.remove = (id_note, id_company) => {
    const sql = `DELETE FROM client_private_notes WHERE id = $1 AND id_company = $2`;
    return db.result(sql, [id_note, id_company]);
};

module.exports = ClientPrivateNote;
