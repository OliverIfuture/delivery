const db = require('../config/config'); // Ajusta esta ruta a donde tengas tu conexión de BD
const bcrypt = require('bcryptjs');

const EmoonUser = {};

// Buscar por ID (usado por Passport)
EmoonUser.findById = (id) => {
    const sql = `
        SELECT * FROM emoon.emoon_users 
        WHERE id = $1
    `;
    return db.oneOrNone(sql, id);
};

// Buscar por Email (usado para Login y para evitar duplicados en el Registro)
EmoonUser.findByEmail = (email) => {
    const sql = `
        SELECT * FROM emoon.emoon_users 
        WHERE email = $1
    `;
    return db.oneOrNone(sql, email);
};

// Crear nuevo usuario (Registro)
EmoonUser.create = async (user) => {
    // Encriptamos la contraseña con un "salt" de 10 rondas
    const hash = await bcrypt.hash(user.password, 10);

    const sql = `
        INSERT INTO emoon.emoon_users(
            first_name, 
            last_name, 
            email, 
            phone, 
            password, 
            role, 
            created_at, 
            updated_at
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `;

    return db.oneOrNone(sql, [
        user.first_name,
        user.last_name,
        user.email,
        user.phone,
        hash, // Guardamos el hash, no la contraseña en texto plano
        user.role || 'client',
        new Date(),
        new Date()
    ]);
};

module.exports = EmoonUser;