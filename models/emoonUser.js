// models/emoonUser.js
const db = require('../config/config');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // <-- ASEGÚRATE DE TENER ESTO INSTALADO (npm install jsonwebtoken)
const Keys = require('../config/keys'); // Tu archivo de llaves para el token

const EmoonUser = {};

// ... (Aquí van findById, findByEmail y create que ya teníamos) ...

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

// Crear usuario (Registro) - ¡AQUÍ ASEGÚRATE DE RETORNAR TODOS LOS CAMPOS!
EmoonUser.create = async (user) => {
    const hash = await bcrypt.hash(user.password, 10);
    const sql = `
        INSERT INTO emoon.emoon_users(
            first_name, last_name, email, phone, password, role, created_at, updated_at
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `; // Cambiamos RETURNING id por RETURNING *
    return db.oneOrNone(sql, [
        user.first_name, user.last_name, user.email, user.phone, hash, user.role || 'client', new Date(), new Date()
    ]);
};


// 1. NUEVA FUNCIÓN: Generar Token
EmoonUser.generateToken = (user) => {
    // Que datos del usuario viajan cifrados dentro del token
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role
    };

    // Firma el token con la clave secreta y expira en 30 días
    return jwt.sign(payload, Keys.secretOrKey, { expiresIn: '30d' });
};

module.exports = EmoonUser;