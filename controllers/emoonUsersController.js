// controllers/emoonUsersController.js
const EmoonUser = require('../models/emoonUser');
const bcrypt = require('bcryptjs');

module.exports = {

    async register(req, res) {
        // ... (Tu código de register intacto) ...
        try {
            const user = req.body;
            const existingUser = await EmoonUser.findByEmail(user.email);
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'El correo electrónico ya se encuentra registrado.' });
            }
            const data = await EmoonUser.create(user);

            // Generar token para que entre directamente logueado al registrarse
            const token = `JWT ${EmoonUser.generateToken(data)}`;

            return res.status(201).json({
                success: true,
                message: '¡Tu cuenta ha sido creada con éxito!',
                data: {
                    id: data.id,
                    email: data.email,
                    first_name: data.first_name,
                    role: data.role,
                    session_token: token
                }
            });
        } catch (error) {
            console.log('Error register:', error);
            return res.status(500).json({ success: false, message: 'Hubo un error interno al registrar la cuenta.', error: error.message });
        }
    },

    // 2. NUEVA FUNCIÓN: Login
    async login(req, res) {
        try {
            const email = req.body.email;
            const password = req.body.password;

            // 1. Buscar si el usuario existe
            const user = await EmoonUser.findByEmail(email);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'El correo electrónico no fue encontrado.'
                });
            }

            // 2. Comparar contraseñas
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (isPasswordValid) {
                // 3. Crear Token
                const token = `JWT ${EmoonUser.generateToken(user)}`;

                // Extraer solo la data pública para enviar al frontend (NUNCA enviar el password de vuelta)
                const data = {
                    id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    session_token: token
                };

                return res.status(200).json({
                    success: true,
                    message: '¡Bienvenido(a)!',
                    data: data
                });

            } else {
                // Contraseña incorrecta
                return res.status(401).json({
                    success: false,
                    message: 'La contraseña es incorrecta.'
                });
            }

        } catch (error) {
            console.log('Error en emoonUsersController.login:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al intentar iniciar sesión',
                error: error.message
            });
        }
    }
};