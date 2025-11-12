const Gym = require('../models/gym.js');
const User = require('../models/user.js'); // Para obtener datos del usuario
const jwt = require('jsonwebtoken'); // Para decodificar el QR (si es un JWT)
const keys = require('../config/keys.js');

module.exports = {

    /**
     * POST /api/gym/check-in
     * Maneja el escaneo de un QR en la entrada del gimnasio.
     * Esta es la lógica del Kiosco/Torniquete.
     */
    async checkIn(req, res, next) {
        try {
            // El Kiosco/Tablet envía el ID del usuario que escaneó
            const { id_client_scanned } = req.body; 
            // El Kiosco/Tablet está logueado, así que sabemos a qué gimnasio pertenece
            const id_company_gym = req.user.mi_store; 

            if (!id_company_gym) {
                return res.status(403).json({
                    success: false,
                    message: 'Permiso denegado: Este dispositivo no es un Kiosco autorizado.'
                });
            }

            if (!id_client_scanned) {
                 return res.status(400).json({ success: false, message: 'QR inválido o ilegible.' });
            }

            // 1. Verificar si el cliente tiene una membresía activa
            const activeMembership = await Gym.findActiveMembership(id_client_scanned, id_company_gym);

            if (activeMembership) {
                // --- ACCESO CONCEDIDO ---
                
                // 2. Registrar el acceso exitoso en el log
                await Gym.logAccess(id_company_gym, id_client_scanned, true, 'Membresía Activa');
                
                // 3. (Opcional) Obtener datos del cliente para mostrar en pantalla
                const client = await User.findById(id_client_scanned, () => {}); 

                return res.status(200).json({
                    success: true,
                    access_granted: true,
                    message: `¡Bienvenido, ${client ? client.name : ''}!`,
                    data: {
                        client_name: client ? `${client.name} ${client.lastname}` : 'Miembro',
                        plan_name: activeMembership.plan_name,
                        expires: activeMembership.end_date
                    }
                });

            } else {
                // --- ACCESO DENEGADO ---
                
                // 2. Registrar el acceso fallido en el log
                await Gym.logAccess(id_company_gym, id_client_scanned, false, 'Membresía Expirada o Inexistente');
                
                return res.status(401).json({ // 401 No Autorizado
                    success: false,
                    access_granted: false,
                    message: 'Acceso Denegado: Membresía expirada o no encontrada.',
                });
            }

        } catch (error) {
            console.log(`Error en gymController.checkIn: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error interno al procesar el acceso',
                error: error.message
            });
        }
    },

    /**
     * POST /api/gym/create-membership
     * Usado por el Admin del Gimnasio (POS) para crear una membresía (ej. pago en efectivo)
     */
    async createMembership(req, res, next) {
        try {
            const { id_client, plan_name, price, duration_days, payment_method, payment_id } = req.body;
            const id_company_gym = req.user.mi_store; // El ID del gimnasio (del staff logueado)

            if (!id_client || !plan_name || !price || !duration_days) {
                return res.status(400).json({ success: false, message: 'Faltan datos para crear la membresía.' });
            }

            // Calcular la fecha de vencimiento
            let endDate = new Date();
            endDate.setDate(endDate.getDate() + parseInt(duration_days));

            const membership = {
                id_client: id_client,
                id_company: id_company_gym,
                plan_name: plan_name,
                price: price,
                end_date: endDate,
                payment_method: payment_method || 'cash',
                payment_id: payment_id || null
            };

            const data = await Gym.createMembership(membership);

            return res.status(201).json({
                success: true,
                message: 'Membresía creada exitosamente.',
                data: { id: data.id }
            });

        } catch (error) {
            console.log(`Error en gymController.createMembership: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al crear la membresía',
                error: error.message
            });
        }
    },

    /**
     * GET /api/gym/get-membership-status/:id_client
     * Usado por la App del Cliente para saber si debe mostrar el QR
     */
    async getMembershipStatus(req, res, next) {
        try {
            const id_client = req.params.id_client;
            
            // Seguridad: Asegurarse de que el cliente solo pueda ver su propio estado
            if (req.user.id != id_client) {
                 return res.status(403).json({ success: false, message: 'No tienes permiso.' });
            }
            
            // Buscar membresía activa en CUALQUIER gimnasio (para mostrar el QR)
            // (Esta lógica asume que el QR es genérico y el kiosco sabe a qué gym pertenece)
            // Una mejor lógica es buscar por el gimnasio específico si el cliente ya está "casado" con uno.
            
            // Por ahora, buscamos la membresía más próxima a vencer en cualquier gym
            const sql = `
                SELECT id_company, plan_name, end_date 
                FROM gym_memberships 
                WHERE id_client = $1 AND status = 'active' AND end_date > NOW() 
                ORDER BY end_date ASC 
                LIMIT 1
            `;
            const activeMembership = await db.oneOrNone(sql, [id_client]);

            if (activeMembership) {
                return res.status(200).json({
                    success: true,
                    status: 'active',
                    data: activeMembership
                });
            }

            return res.status(200).json({
                success: true,
                status: 'inactive'
            });

        } catch (error) {
            console.log(`Error en gymController.getMembershipStatus: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener estado de membresía',
                error: error.message
            });
        }
    }

};
