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
    const sql = `SELECT * FROM emoon.emoon_users WHERE email = $1`;
    return db.oneOrNone(sql, email);
};

// NUEVA FUNCIÓN: Obtener todos los usuarios (ordenados por fecha de creación)
EmoonUser.getAll = () => {
    const sql = `
        SELECT 
            id, first_name, last_name, email, phone, avatar_url, role, 
            stats_classes_attended, stats_total_spent, created_at 
        FROM emoon.emoon_users 
        ORDER BY created_at DESC
    `;
    // Nota: Excluimos intencionalmente la columna 'password' por seguridad
    return db.manyOrNone(sql);
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
            first_name, last_name, email, phone, password, role, created_at, updated_at
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `;
    return db.oneOrNone(sql, [
        user.first_name, user.last_name, user.email, user.phone, hash, user.role || 'client', new Date(), new Date()
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

module.exports = EmoonUser;