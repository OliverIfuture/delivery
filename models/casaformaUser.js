// models/casaformaUser.js — mismo patrón que models/emoonUser.js, apuntado
// al schema casaforma (club aparte, nunca se mezcla con emoon.emoon_users
// ni con la tabla "users" de Trainer Partners).
const db = require('../config/config');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Keys = require('../config/keys');

const CasaformaUser = {};

CasaformaUser.findById = (id) => {
    const sql = `SELECT * FROM casaforma.casaforma_users WHERE id = $1 AND is_deleted = false`;
    return db.oneOrNone(sql, id);
};

CasaformaUser.findByEmail = (email) => {
    const sql = `SELECT * FROM casaforma.casaforma_users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND is_deleted = false`;
    return db.oneOrNone(sql, email);
};

CasaformaUser.getAll = () => {
    const sql = `
        SELECT
            id, first_name, last_name, email, phone, avatar_url, role,
            is_active, stats_classes_attended, stats_total_spent, birth_date, created_at
        FROM casaforma.casaforma_users WHERE is_deleted = false
        ORDER BY created_at DESC
    `;
    // Excluimos 'password' a propósito, igual que emoonUser.getAll.
    return db.manyOrNone(sql);
};

CasaformaUser.update = (id, fields) => {
    const sql = `
        UPDATE casaforma.casaforma_users
        SET
            first_name = COALESCE($2, first_name),
            last_name = COALESCE($3, last_name),
            phone = COALESCE($4, phone),
            email = COALESCE($5, email),
            updated_at = $6
        WHERE id = $1 AND is_deleted = false
        RETURNING id, first_name, last_name, email, phone, avatar_url, role, birth_date
    `;
    return db.oneOrNone(sql, [
        id,
        fields.first_name,
        fields.last_name,
        fields.phone,
        fields.email,
        new Date()
    ]);
};

CasaformaUser.updateRole = (id, role) => {
    const sql = `
        UPDATE casaforma.casaforma_users
        SET role = $2, updated_at = $3
        WHERE id = $1
        RETURNING id, first_name, last_name, email, role
    `;
    return db.oneOrNone(sql, [id, role, new Date()]);
};

CasaformaUser.create = async (user) => {
    const hash = await bcrypt.hash(user.password, 10);
    const sql = `
        INSERT INTO casaforma.casaforma_users(
            first_name, last_name, email, phone, birth_date, password, role, created_at, updated_at
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `;
    return db.oneOrNone(sql, [
        user.first_name,
        user.last_name || '',
        user.email,
        user.phone || '',
        user.birth_date || null,
        hash,
        user.role || 'client',
        new Date(),
        new Date()
    ]);
};

CasaformaUser.generateToken = (user) => {
    const payload = { id: user.id, email: user.email, role: user.role };
    return jwt.sign(payload, Keys.secretOrKey, { expiresIn: '30d' });
};

CasaformaUser.delete = (id) => {
    const sql = `
        UPDATE casaforma.casaforma_users
        SET is_deleted = TRUE
        WHERE id = $1
        RETURNING id
    `;
    return db.oneOrNone(sql, [id]);
};

// ------------------------------------------------------------
// Recuperación de contraseña — código + vencimiento en la misma fila
// (igual que database/users_password_reset.sql de Trainer Partners).
// El envío del correo lo sigue haciendo public/api/send-otp.php en
// Hostinger (es el único canal de correo real que ya existe para Casa
// Forma); aquí solo se genera/valida el código de verdad en el servidor,
// en vez de en el mock del navegador.
// ------------------------------------------------------------
CasaformaUser.setPasswordResetCode = (email, code, expiresAt) => {
    const sql = `
        UPDATE casaforma.casaforma_users
        SET password_reset_code = $2, password_reset_expires_at = $3
        WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND is_deleted = false
        RETURNING id, email
    `;
    return db.oneOrNone(sql, [email, code, expiresAt]);
};

CasaformaUser.clearPasswordResetCode = (email) => {
    const sql = `
        UPDATE casaforma.casaforma_users
        SET password_reset_code = NULL, password_reset_expires_at = NULL
        WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
    `;
    return db.none(sql, [email]);
};

CasaformaUser.updatePassword = async (email, newPassword) => {
    const hash = await bcrypt.hash(newPassword, 10);
    const sql = `
        UPDATE casaforma.casaforma_users
        SET password = $2, password_reset_code = NULL, password_reset_expires_at = NULL, updated_at = NOW()
        WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND is_deleted = false
        RETURNING id, email
    `;
    return db.oneOrNone(sql, [email, hash]);
};

module.exports = CasaformaUser;
