// controllers/emoonUsersController.js
const EmoonUser = require('../models/emoonUser');
const bcrypt = require('bcryptjs');

module.exports = {

    // 1. Registro
    async register(req, res) {
        try {
            const user = req.body;
            const existingUser = await EmoonUser.findByEmail(user.email);
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'El correo electrónico ya se encuentra registrado.' });
            }
            const data = await EmoonUser.create(user);
            const token = `JWT ${EmoonUser.generateToken(data)}`;

// En el método register:
return res.status(201).json({
    success: true,
    message: '¡Tu cuenta ha sido creada con éxito!',
    data: {
        id: data.id,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        birth_date: data.birth_date, // <--- OBLIGATORIO AQUÍ
        role: data.role,
        session_token: token
    }
});
        } catch (error) {
            console.log('Error register:', error);
            return res.status(500).json({ success: false, message: 'Hubo un error interno al registrar la cuenta.', error: error.message });
        }
    },

    // 2. Login
    async login(req, res) {
        try {
            const email = req.body.email;
            const password = req.body.password;

            const user = await EmoonUser.findByEmail(email);
            if (!user) {
                return res.status(401).json({ success: false, message: 'El correo electrónico no fue encontrado.' });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (isPasswordValid) {
                const token = `JWT ${EmoonUser.generateToken(user)}`;
                const data = {
                    id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    phone: user.phone,
                    birth_date: user.birth_date,
                    role: user.role,
                    session_token: token
                };
                return res.status(200).json({ success: true, message: '¡Bienvenido(a)!', data: data });
            } else {
                return res.status(401).json({ success: false, message: 'La contraseña es incorrecta.' });
            }
        } catch (error) {
            console.log('Error login:', error);
            return res.status(500).json({ success: false, message: 'Error al intentar iniciar sesión', error: error.message });
        }
    },

    // 3. NUEVO: Obtener todos los usuarios (Protegido)
    async getAll(req, res) {
        try {
            const users = await EmoonUser.getAll();

            return res.status(200).json({
                success: true,
                message: 'Usuarios obtenidos correctamente',
                data: users // Lista de usuarios de PostgreSQL
            });
        } catch (error) {
            console.log('Error en emoonUsersController.getAll:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener la lista de usuarios',
                error: error.message
            });
        }
    },

    // 4. NUEVO: Actualizar el rol de un usuario
    async updateRole(req, res) {
        try {
            const userId = req.body.id;
            const newRole = req.body.role;

            // Validación básica
            if (!userId || !newRole) {
                return res.status(400).json({ success: false, message: 'Faltan datos obligatorios (id o role).' });
            }

            const updatedUser = await EmoonUser.updateRole(userId, newRole);

            if (!updatedUser) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
            }

            return res.status(200).json({
                success: true,
                message: 'Rol de usuario actualizado correctamente.',
                data: updatedUser
            });

        } catch (error) {
            console.log('Error en emoonUsersController.updateRole:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al actualizar el rol del usuario.',
                error: error.message
            });
        }
    }
};