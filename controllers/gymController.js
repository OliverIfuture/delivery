const Gym = require('../models/gym.js');
const User = require('../models/user.js'); 
const jwt = require('jsonwebtoken'); // **IMPORTANTE: Para crear/validar tokens**
const keys = require('../config/keys.js');
const db = require('../config/config.js');

module.exports = {

    /**
     * **NUEVA FUNCIÓN (G2.1a)**
     * Crea un token de acceso QR de corta duración (30 segundos)
     */
    async generateAccessToken(req, res, next) {
        try {
            const id_client = req.user.id; // ID del cliente (desde el token de sesión)
            
            // 1. Crear el payload del QR
            const payload = {
                id_client: id_client,
                type: 'gym_access_qr' // Identificador
            };

            // 2. Firmar el token con una expiración CORTA
            const qrToken = jwt.sign(
                payload, 
                keys.secretOrKey, 
                { expiresIn: '60s' } // <-- ¡Caduca en 30 segundos!
            );
            
            // 3. Devolver el token a la app de Flutter
            return res.status(200).json({
                success: true,
                qr_token: qrToken
            });

        } catch (error) {
            console.log(`Error en gymController.generateAccessToken: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al generar el token de acceso',
                error: error.message
            });
        }
    },


    /**
     * **FUNCIÓN MODIFICADA (G2.1b) - (Reemplaza a 'checkIn')**
     * Maneja el escaneo del QR (ahora un JWT) en la entrada del gimnasio.
     */
    async checkInWithToken(req, res, next) {
        try {
            // El Kiosco/Tablet envía el token que escaneó
            const { qr_token } = req.body; 
            // El Kiosco/Tablet está logueado, así que sabemos a qué gimnasio pertenece
            const id_company_gym = req.user.mi_store; 

            if (!id_company_gym) {
                return res.status(403).json({ success: false, message: 'Dispositivo no autorizado.' });
            }
            if (!qr_token) {
                 return res.status(400).json({ success: false, message: 'QR inválido.' });
            }
            
            let payload;
            
            // 1. Verificar el QR (JWT)
            try {
                payload = jwt.verify(qr_token, keys.secretOrKey);
            } catch (e) {
                // Si el token es inválido o expiró
                console.log(`Intento de acceso fallido: ${e.message}`);
                await Gym.logAccess(id_company_gym, null, false, 'QR Inválido o Expirado');
                return res.status(401).json({ 
                    success: false, 
                    access_granted: false,
                    message: 'QR Inválido o Expirado. Vuelve a cargar el QR en tu app.' 
                });
            }

            // 2. Extraer el ID del cliente del payload del token
            const id_client_scanned = payload.id;

            // 3. Verificar Membresía Activa (Lógica que ya teníamos)
            const activeMembership = await Gym.findActiveMembership(id_client_scanned, id_company_gym);
            console.log(`Datos del clietnte: ${id_client_scanned} : ${id_company_gym}`);


            if (activeMembership) {
                // --- ACCESO CONCEDIDO ---
                await Gym.logAccess(id_company_gym, id_client_scanned, true, 'Membresía Activa');
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
                await Gym.logAccess(id_company_gym, id_client_scanned, false, 'Membresía Expirada o Inexistente');
                
                return res.status(401).json({
                    success: false,
                    access_granted: false,
                    message: 'Acceso Denegado: Membresía expirada o no encontrada.',
                });
            }

        } catch (error) {
            console.log(`Error en gymController.checkInWithToken: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error interno al procesar el acceso',
                error: error.message
            });
        }
    },

    /**
     * POST /api/gym/create-membership
     * (Esta función no necesita cambios)
     */
    async createMembership(req, res, next) {
        try {
            // **PASO 1: Leer TODOS los datos del body (incluyendo id_shift)**
            const { 
                id_client, 
                plan_name, 
                price, 
                duration_days, 
                payment_method, 
                payment_id,
                id_shift  // <-- ¡EL DATO QUE FALTABA!
            } = req.body;
            
            const id_company_gym = req.user.mi_store; 

            if (!id_client || !plan_name || !price || !duration_days || !id_shift) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Faltan datos para crear la membresía (client, plan, price, duration, shift).' 
                });
            }

            let endDate = new Date();
            endDate.setDate(endDate.getDate() + parseInt(duration_days));

            // **PASO 2: Construir el objeto COMPLETO para el modelo**
            const membership = {
                id_client: id_client,
                id_company: id_company_gym,
                plan_name: plan_name,
                price: price,
                end_date: endDate,
                payment_method: payment_method || 'cash',
                payment_id: payment_id || null,
                id_shift: id_shift // <-- ¡PASANDO EL ID DEL TURNO AL MODELO!
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
     * (Esta función no necesita cambios)
     */
    async getMembershipStatus(req, res, next) {
        try {
            const id_client = req.params.id_client;
            
            if (req.user.id != id_client) {
                 return res.status(403).json({ success: false, message: 'No tienes permiso.' });
            }
            
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
    },

    
    // --- **NUEVAS FUNCIONES: CRUD DE PLANES (Paso G4.1)** ---

    /**
     * POST /api/gym/plans/create
     * (Admin Gym) Crea un nuevo plan de membresía
     */
    async createMembershipPlan(req, res, next) {
        try {
            const plan = req.body;
            plan.id_company = req.user.mi_store; // Asignar al gimnasio del admin logueado

            if (!plan.name || !plan.price || !plan.duration_days) {
                return res.status(400).json({ success: false, message: 'Faltan datos (nombre, precio, días).' });
            }

            const data = await Gym.createPlan(plan);
            return res.status(201).json({
                success: true,
                message: 'Plan creado exitosamente.',
                data: { id: data.id }
            });
        } catch (error) {
            console.log(`Error en gymController.createMembershipPlan: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al crear el plan', error: error.message });
        }
    },

    /**
     * PUT /api/gym/plans/update
     * (Admin Gym) Actualiza un plan
     */
    async updateMembershipPlan(req, res, next) {
        try {
            const plan = req.body;
            plan.id_company = req.user.mi_store;

            if (!plan.id) {
                return res.status(400).json({ success: false, message: 'Falta el ID del plan.' });
            }

            await Gym.updatePlan(plan);
            return res.status(200).json({
                success: true,
                message: 'Plan actualizado exitosamente.'
            });
        } catch (error) {
            console.log(`Error en gymController.updateMembershipPlan: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al actualizar el plan', error: error.message });
        }
    },

    /**
     * DELETE /api/gym/plans/delete/:id
     * (Admin Gym) Elimina un plan
     */
    async deleteMembershipPlan(req, res, next) {
        try {
            const id_plan = req.params.id;
            const id_company = req.user.mi_store;

            await Gym.deletePlan(id_plan, id_company);
            return res.status(200).json({
                success: true,
                message: 'Plan eliminado exitosamente.'
            });
        } catch (error) {
            console.log(`Error en gymController.deleteMembershipPlan: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al eliminar el plan', error: error.message });
        }
    },

    /**
     * GET /api/gym/plans
     * (Kiosco/POS) Obtiene todos los planes activos de este gimnasio
     */
    async getMembershipPlans(req, res, next) {
        try {
            const id_company = req.user.mi_store;
            const data = await Gym.findPlansByCompany(id_company);
            return res.status(200).json(data);
        } catch (error) {
            console.log(`Error en gymController.getMembershipPlans: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener los planes', error: error.message });
        }
    },

    // *** ¡NUEVA FUNCIÓN PARA EL HISTORIAL DEL CLIENTE! ***
    /**
     * GET /api/gym/my-history
     * Busca el historial de membresías del cliente logueado
     */
    async getMembershipHistory(req, res, next) {
        try {
            const id_client = req.user.id; // Cliente autenticado
            
            const data = await Gym.findMembershipHistory(id_client);
            
            // Devuelve la lista (puede estar vacía)
            return res.status(200).json(data);

        } catch (error) {
            console.log(`Error en gymController.getMembershipHistory: ${error}`);
            return res.status(501).json({ 
                success: false, 
                message: 'Error al obtener el historial de membresías', 
                error: error.message 
            });
        }
    },

async getMembershipHistoryByShift(req, res, next) {
        try {
            const id_shift = req.params.id_shift;
            
            // (Opcional) Seguridad: Verificar que el staff pertenece al mismo gimnasio
            // const id_company = req.user.mi_store; 
            // ... (lógica de verificación) ...

            const data = await Gym.findMembershipHistoryByShift(id_shift);
            
            return res.status(200).json(data);

        } catch (error) {
            console.log(`Error en gymController.getMembershipHistoryByShift: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener historial del turno', error: error.message });
        }
    },
    
};
