const EmoonUser = require('../models/emoonUser');

module.exports = {

    async register(req, res) {
        try {
            const user = req.body;

            // 1. Validar si el correo ya está registrado en Emoon
            const existingUser = await EmoonUser.findByEmail(user.email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'El correo electrónico ya se encuentra registrado.',
                    error: 'Email duplication'
                });
            }

            // 2. Insertar en la Base de Datos
            const data = await EmoonUser.create(user);

            // 3. Responder Éxito (Respuesta estandarizada)
            return res.status(201).json({
                success: true,
                message: '¡Tu cuenta ha sido creada con éxito!',
                data: {
                    id: data.id // Devolvemos el UUID generado por Postgres
                }
            });

        } catch (error) {
            console.log('Error en emoonUsersController.register:', error);

            // Responder Error Controlado
            return res.status(500).json({
                success: false,
                message: 'Hubo un error interno al registrar la cuenta.',
                error: error.message
            });
        }
    }

};