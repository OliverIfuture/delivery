// models/emoonUser.js
const db = require('../config/config');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Keys = require('../config/keys');

const EmoonUser = {};

// Buscar por ID
EmoonUser.findById = (id) => {
    const sql = `SELECT * FROM emoon.emoon_users WHERE id = $1`;
    return db.oneOrNone(sql, id);
};

// Buscar por Email
EmoonUser.findByEmail = (email) => {
    const sql = `SELECT * FROM emoon.emoon_users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`;
    return db.oneOrNone(sql, email);
};

// NUEVA FUNCIÓN: Obtener todos los usuarios (ordenados por fecha de creación)
EmoonUser.getAll = () => {
    const sql = `
        SELECT 
            id, first_name, last_name, email, phone, avatar_url, role, 
            stats_classes_attended, stats_total_spent, created_at 
        FROM emoon.emoon_users  where is_deleted = false
        ORDER BY created_at DESC
    `;
    // Nota: Excluimos intencionalmente la columna 'password' por seguridad
    return db.manyOrNone(sql);
};

// Actualizar datos de perfil (nombre, apellido, teléfono, correo)
EmoonUser.update = (id, fields) => {
    const sql = `
        UPDATE emoon.emoon_users
        SET
            first_name = $2,
            last_name = $3,
            phone = $4,
            email = $5,
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

// NUEVA FUNCIÓN: Actualizar el rol del usuario
EmoonUser.updateRole = (id, role) => {
    const sql = `
        UPDATE emoon.emoon_users
        SET 
            role = $2,
            updated_at = $3
        WHERE id = $1
        RETURNING id, first_name, last_name, email, role
    `;
    return db.oneOrNone(sql, [id, role, new Date()]);
};

// Crear usuario (Registro)
EmoonUser.create = async (user) => {
    const hash = await bcrypt.hash(user.password, 10);
    const sql = `
        INSERT INTO emoon.emoon_users(
            first_name, last_name, email, phone, birth_date, password, role, created_at, updated_at
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `;
    return db.oneOrNone(sql, [
        user.first_name, 
        user.last_name, 
        user.email, 
        user.phone, 
        user.birth_date || null, 
        hash, 
        user.role || 'client', 
        new Date(), 
        new Date()
    ]);
};

// Generar Token JWT
EmoonUser.generateToken = (user) => {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role
    };
    return jwt.sign(payload, Keys.secretOrKey, { expiresIn: '30d' });
};
EmoonUser.delete = (id) => {
    const sql = `
        UPDATE emoon.emoon_users
        SET is_deleted = TRUE
        WHERE id = $1
        RETURNING id
    `;
    return db.oneOrNone(sql, [id]);
};

// --- Reset de contraseña por OTP — puerto 1:1 de casaformaUser.js ---

EmoonUser.setPasswordResetCode = (email, code, expiresAt) => {
    const sql = `
        UPDATE emoon.emoon_users
        SET password_reset_code = $2, password_reset_expires_at = $3
        WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND is_deleted = false
        RETURNING id, email
    `;
    return db.oneOrNone(sql, [email, code, expiresAt]);
};

EmoonUser.clearPasswordResetCode = (email) => {
    const sql = `
        UPDATE emoon.emoon_users
        SET password_reset_code = NULL, password_reset_expires_at = NULL
        WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
    `;
    return db.none(sql, [email]);
};

EmoonUser.updatePassword = async (email, newPassword) => {
    const hash = await bcrypt.hash(newPassword, 10);
    const sql = `
        UPDATE emoon.emoon_users
        SET password = $2, password_reset_code = NULL, password_reset_expires_at = NULL, updated_at = NOW()
        WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND is_deleted = false
        RETURNING id, email
    `;
    return db.oneOrNone(sql, [email, hash]);
};

module.exports = EmoonUser;