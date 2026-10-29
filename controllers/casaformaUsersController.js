// controllers/casaformaUsersController.js — mismo patrón que
// controllers/emoonUsersController.js, apuntado a CasaformaUser.
const normalizeEmail = require('../utils/normalizeEmail.js');
const CasaformaUser = require('../models/casaformaUser');
const bcrypt = require('bcryptjs');

module.exports = {

    async register(req, res) {
        try {
            const user = req.body;
            if (user.email) user.email = normalizeEmail(user.email);
            const existingUser = await CasaformaUser.findByEmail(user.email);
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'El correo electrónico ya se encuentra registrado.' });
            }
            const data = await CasaformaUser.create(user);
            const token = `JWT ${CasaformaUser.generateToken(data)}`;

            return res.status(201).json({
                success: true,
                message: '¡Tu cuenta ha sido creada con éxito!',
                data: {
                    id: data.id,
                    email: data.email,
                    first_name: data.first_name,
                    last_name: data.last_name,
                    phone: data.phone,
                    birth_date: data.birth_date,
                    role: data.role,
                    session_token: token
                }
            });
        } catch (error) {
            console.log('Error casaforma register:', error);
            return res.status(500).json({ success: false, message: 'Hubo un error interno al registrar la cuenta.', error: error.message });
        }
    },

    async login(req, res) {
        try {
            const email = normalizeEmail(req.body.email);
            const password = req.body.password;

            const user = await CasaformaUser.findByEmail(email);
            if (!user) {
                return res.status(401).json({ success: false, message: 'El correo electrónico no fue encontrado.' });
            }
            if (!user.is_active) {
                return res.status(401).json({ success: false, message: 'Esta cuenta está desactivada.' });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ success: false, message: 'La contraseña es incorrecta.' });
            }

            const token = `JWT ${CasaformaUser.generateToken(user)}`;
            const data = {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                phone: user.phone,
                birth_date: user.birth_date,
                role: user.role,
                avatar_url: user.avatar_url,
                stats_classes_attended: user.stats_classes_attended,
                stats_total_spent: user.stats_total_spent,
                session_token: token
            };
            return res.status(200).json({ success: true, message: '¡Bienvenido(a)!', data });
        } catch (error) {
            console.log('Error casaforma login:', error);
            return res.status(500).json({ success: false, message: 'Error al intentar iniciar sesión', error: error.message });
        }
    },

    async getAll(req, res) {
        try {
            const users = await CasaformaUser.getAll();
            return res.status(200).json({ success: true, message: 'Usuarios obtenidos correctamente', data: users });
        } catch (error) {
            console.log('Error en casaformaUsersController.getAll:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener la lista de usuarios', error: error.message });
        }
    },

    async update(req, res) {
        try {
            const { id, first_name, last_name, phone } = req.body;
            let email = req.body.email;

            if (!id) {
                return res.status(400).json({ success: false, message: 'Falta el id del usuario.' });
            }

            if (email) {
                email = normalizeEmail(email);
                const existingUser = await CasaformaUser.findByEmail(email);
                if (existingUser && String(existingUser.id) !== String(id)) {
                    return res.status(400).json({ success: false, message: 'Ese correo electrónico ya está en uso por otra cuenta.' });
                }
            }

            const updatedUser = await CasaformaUser.update(id, { first_name, last_name, phone, email });
            if (!updatedUser) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
            }

            return res.status(200).json({ success: true, message: 'Perfil actualizado correctamente.', data: updatedUser });
        } catch (error) {
            console.log('Error en casaformaUsersController.update:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar el perfil.', error: error.message });
        }
    },

    async updateRole(req, res) {
        try {
            const userId = req.body.id;
            const newRole = req.body.role;
            if (!userId || !newRole) {
                return res.status(400).json({ success: false, message: 'Faltan datos obligatorios (id o role).' });
            }

            const updatedUser = await CasaformaUser.updateRole(userId, newRole);
            if (!updatedUser) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
            }

            return res.status(200).json({ success: true, message: 'Rol de usuario actualizado correctamente.', data: updatedUser });
        } catch (error) {
            console.log('Error en casaformaUsersController.updateRole:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar el rol del usuario.', error: error.message });
        }
    },

    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const data = await CasaformaUser.delete(id);
            if (!data) {
                return res.status(404).json({ success: false, message: 'El usuario no existe o ya fue eliminado.' });
            }
            return res.status(200).json({ success: true, message: 'Usuario eliminado correctamente.', data });
        } catch (error) {
            console.error('Error casaforma deleteUser:', error);
            return res.status(500).json({ success: false, message: 'Error al eliminar el usuario.', error: error.message });
        }
    },

    // ------------------------------------------------------------
    // Recuperación de contraseña — el código ahora se genera y se valida
    // aquí (antes vivía en el mock del navegador, ver
    // src/api/usersProvider.js de casa-forma). El envío del correo sigue
    // pasando por public/api/send-otp.php en Hostinger, por eso este
    // endpoint regresa el código en la respuesta solo si el frontend no
    // logró mandarlo por correo (mismo "otpPreview" de respaldo que ya
    // existía en el mock, para no bloquear pruebas).
    // ------------------------------------------------------------
    async sendPasswordResetOtp(req, res) {
        try {
            const email = normalizeEmail(req.body.email);
            const user = await CasaformaUser.findByEmail(email);
            if (!user) {
                return res.status(404).json({ success: false, message: 'No encontramos una cuenta con ese correo.' });
            }

            const code = String(Math.floor(100000 + Math.random() * 900000));
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
            await CasaformaUser.setPasswordResetCode(email, code, expiresAt);

            return res.status(200).json({
                success: true,
                message: 'Código generado.',
                data: { code } // el frontend decide si lo manda por correo o lo muestra como otpPreview
            });
        } catch (error) {
            console.log('Error casaforma sendPasswordResetOtp:', error);
            return res.status(500).json({ success: false, message: 'No se pudo generar el código.', error: error.message });
        }
    },

    async verifyPasswordResetOtp(req, res) {
        try {
            const email = normalizeEmail(req.body.email);
            const otp = String(req.body.otp || '').trim();

            const user = await CasaformaUser.findByEmail(email);
            if (!user || !user.password_reset_code) {
                return res.status(400).json({ success: false, message: 'Primero solicita un código.' });
            }
            if (new Date() > new Date(user.password_reset_expires_at)) {
                await CasaformaUser.clearPasswordResetCode(email);
                return res.status(400).json({ success: false, message: 'Tu código venció. Solicita uno nuevo.' });
            }
            if (user.password_reset_code !== otp) {
                return res.status(400).json({ success: false, message: 'Código incorrecto.' });
            }

            return res.status(200).json({ success: true, message: 'Código correcto.' });
        } catch (error) {
            console.log('Error casaforma verifyPasswordResetOtp:', error);
            return res.status(500).json({ success: false, message: 'No se pudo verificar el código.', error: error.message });
        }
    },

    async resetPassword(req, res) {
        try {
            const email = normalizeEmail(req.body.email);
            const otp = String(req.body.otp || '').trim();
            const newPassword = req.body.newPassword;

            const user = await CasaformaUser.findByEmail(email);
            if (!user || !user.password_reset_code || user.password_reset_code !== otp) {
                return res.status(400).json({ success: false, message: 'No se pudo verificar el código. Vuelve a intentarlo.' });
            }
            if (new Date() > new Date(user.password_reset_expires_at)) {
                await CasaformaUser.clearPasswordResetCode(email);
                return res.status(400).json({ success: false, message: 'Tu código venció. Solicita uno nuevo.' });
            }
            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
            }

            await CasaformaUser.updatePassword(email, newPassword);
            return res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente.' });
        } catch (error) {
            console.log('Error casaforma resetPassword:', error);
            return res.status(500).json({ success: false, message: 'No se pudo actualizar la contraseña.', error: error.message });
        }
    }
};
