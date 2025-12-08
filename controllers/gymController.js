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
/**
     * **FUNCIÓN ACTUALIZADA (Maneja JWT y Pases de Día)**
     * Maneja el escaneo del QR en la entrada del gimnasio.
     */
    async checkInWithToken(req, res, next) {
        try {
            const { qr_token } = req.body; 
            const id_company_gym = req.user.mi_store; 

            if (!id_company_gym) {
                return res.status(403).json({ success: false, message: 'Dispositivo no autorizado.' });
            }
            if (!qr_token) {
                 return res.status(400).json({ success: false, message: 'QR inválido.' });
            }
            
            let id_client_scanned = null;
            let denial_reason = 'QR Inválido';

            // --- INICIO DE LA NUEVA LÓGICA ---

            try {
                // --- INTENTO 1: ¿Es un QR de Miembro (JWT)? ---
                const payload = jwt.verify(qr_token, keys.secretOrKey);
                
                // Si llegamos aquí, ES un JWT
                id_client_scanned = payload.id; // Obtenemos el ID del cliente
                console.log(`[CheckIn] Token JWT detectado. Cliente ID: ${id_client_scanned}`);
                denial_reason = 'Membresía Expirada o Inexistente'; // Razón por defecto si falla el siguiente paso


				
console.log('--- DEBUG CHECKIN ---');
console.log('1. ID Cliente escaneado:', id_client_scanned);
console.log('2. ID Gimnasio del Kiosco (mi_store):', id_company_gym);
                const activeMembership = await Gym.findActiveMembership(id_client_scanned, id_company_gym);

                if (activeMembership) {
                    // --- ACCESO CONCEDIDO (MIEMBRO) ---
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
                }
                
                // Si no hay membresía activa, el 'catch' de abajo lo manejará (denegado)

            } catch (e) {
                // --- INTENTO 2: ¿Es un QR de Pase de Día (Token Crudo)? ---
                // (El 'catch' se activa si jwt.verify() falla, lo cual es esperado para Pases de Día)
                console.log(`[CheckIn] No es un JWT (${e.message}). Buscando como Pase de Día...`);

                const activeDayPass = await Gym.findActiveDayPass(qr_token, id_company_gym);

                if (activeDayPass) {
                    // --- ACCESO CONCEDIDO (PASE DE DÍA) ---
                    
                    // ¡Importante! Marcamos el pase como 'usado' para que no se pueda volver a escanear
                    await Gym.useDayPass(qr_token);
                    
                    // Registramos el acceso (sin ID de cliente, ya que es un visitante)
                    await Gym.logAccess(id_company_gym, null, true, 'Pase de Día Válido');

                    return res.status(200).json({
                        success: true,
                        access_granted: true,
                        message: '¡Bienvenido! (Pase de Día)',
                        data: {
                            client_name: 'VISITANTE',
                            plan_name: `Pase de ${activeDayPass.duration_hours} horas`,
                            expires: activeDayPass.expires_at
                        }
                    });
                }
                
                // Si no es un JWT y tampoco es un Pase de Día activo,
                // la variable 'denial_reason' se queda como 'QR Inválido'
                // o 'Membresía Expirada' (si el JWT fue válido pero la membresía no).
            }

            // --- FIN DE LA NUEVA LÓGICA ---


            // --- ACCESO DENEGADO (General) ---
            // Si llegamos aquí, es porque ambas verificaciones fallaron
            console.log(`[CheckIn] ACCESO DENEGADO. Razón: ${denial_reason}`);
            await Gym.logAccess(id_company_gym, id_client_scanned, false, denial_reason);
            
            return res.status(401).json({
                success: false,
                access_granted: false,
                message: `Acceso Denegado: ${denial_reason}.`,
            });

        } catch (error) {
            console.log(`Error fatal en gymController.checkInWithToken: ${error}`);
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
            const { 
                id_client, 
                plan_name, 
                price, 
                duration_days, // Pasamos esto al modelo en lugar de calcular fecha aquí
                payment_method, 
                payment_id,
                id_shift 
            } = req.body;
            
            const id_company_gym = req.user.mi_store; 

            if (!id_client || !plan_name || !price || !duration_days || !id_shift) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Faltan datos (client, plan, price, duration, shift).' 
                });
            }

            // Construimos el objeto
            const membershipData = {
                id_client: id_client,
                id_company: id_company_gym,
                plan_name: plan_name,
                price: price,
                duration_days: parseInt(duration_days), // Enviamos días, no fecha
                payment_method: payment_method || 'cash',
                payment_id: payment_id || null,
                id_shift: id_shift
            };

            // LLAMAMOS A LA NUEVA FUNCIÓN INTELIGENTE DEL MODELO
            const data = await Gym.createOrUpdateMembership(membershipData);

            return res.status(201).json({
                success: true,
                message: 'Membresía procesada correctamente (Actualizada o Creada).',
                data: { id: data.id }
            });

        } catch (error) {
            console.log(`Error en gymController.createMembership: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al procesar la membresía',
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
            
            // Validación de seguridad básica
            if (req.user.id != id_client) {
                 return res.status(403).json({ success: false, message: 'No tienes permiso.' });
            }
            
            // CONSULTA SQL OPTIMIZADA:
            // 1. Obtenemos datos de la membresía (m) y de la empresa/gym (c).
            // 2. 'DISTINCT ON (m.id_company)' asegura que solo devolvamos UNA fila por cada gimnasio distinto.
            // 3. 'ORDER BY m.id_company, m.end_date DESC' asegura que esa fila sea la MÁS RECIENTE.
            const sql = `
                SELECT DISTINCT ON (m.id_company) 
                    m.id AS id_membership,
					p.id as plan_id,
                    m.id_company,
                    c.name AS gym_name,
                    c."stripeAccountId",
                    m.plan_name,
                    m.end_date,
                    m.status,
                    m.price
                FROM gym_memberships m
                INNER JOIN company c ON m.id_company = c.id
				left join gym_membership_plans as p on p.id_company = m.id_company
                WHERE m.id_client = $1
                ORDER BY m.id_company, m.end_date DESC
				
            `;

            // Usamos manyOrNone porque el usuario puede estar inscrito en varios gimnasios
            const memberships = await db.manyOrNone(sql, [id_client]);

            // Siempre devolvemos success: true, incluso si la lista está vacía.
            // El frontend se encargará de mostrar "Sin membresías" si el array está vacío.
            return res.status(200).json({
                success: true,
                data: memberships 
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


	async getMembershipStatus2(req, res, next) {
        try {
            const id_client = req.params.id_client;
			const selectedStore = req.params.selectedStore;
            
            // Validación de seguridad básica
            if (req.user.id != id_client) {
                 return res.status(403).json({ success: false, message: 'No tienes permiso.' });
            }
            
            // CONSULTA SQL OPTIMIZADA:
            // 1. Obtenemos datos de la membresía (m) y de la empresa/gym (c).
            // 2. 'DISTINCT ON (m.id_company)' asegura que solo devolvamos UNA fila por cada gimnasio distinto.
            // 3. 'ORDER BY m.id_company, m.end_date DESC' asegura que esa fila sea la MÁS RECIENTE.
            const sql = `
              SELECT DISTINCT ON (m.id_company) 
                    m.id AS id_membership,
					p.id as plan_id,
                    m.id_company,
                    c.name AS gym_name,
                    c."stripeAccountId",
                    m.plan_name,
                    m.end_date,
                    m.status,
                    m.price
                FROM gym_memberships m
                INNER JOIN company c ON m.id_company = c.id
				left join gym_membership_plans as p on p.id_company = m.id_company
                WHERE m.id_client = $1 and c.id = $2
                ORDER BY m.id_company, m.end_date DESC
				
            `;
            const memberships = await db.oneOrNone(sql, [id_client, selectedStore]);

            // Siempre devolvemos success: true, incluso si la lista está vacía.
            // El frontend se encargará de mostrar "Sin membresías" si el array está vacío.
            return res.status(200).json({
                success: true,
                data: memberships 
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
            const id_company = req.user.mi_store; 
            
            if (!plan.name || !plan.price || !plan.duration_days) {
                return res.status(400).json({ success: false, message: 'Faltan datos (nombre, precio, días).' });
            }
            
            // 1. Obtener la compañía (Gimnasio) para usar su clave secreta
            const company = await User.findCompanyById(id_company);
            if (!company || !company.stripeSecretKey) {
                return res.status(400).json({
                    success: false,
                    message: 'El gimnasio no tiene una clave de Stripe configurada.'
                });
            }
            
            const stripe = require('stripe')(company.stripeSecretKey);

            // 2. Crear el Producto en Stripe
            const stripeProduct = await stripe.products.create({
                name: `(GYM) ${plan.name}`, // Añadimos prefijo para diferenciar
                type: 'service', 
            });

            // 3. Crear el Precio (¡PAGO ÚNICO!) en Stripe
            const stripePrice = await stripe.prices.create({
                product: stripeProduct.id,
                unit_amount: (plan.price * 100).toFixed(0), 
                currency: 'mxn',
                // (¡NO HAY 'recurring' block! Esto lo hace un pago único)
            });

            // 4. Asignar los IDs de Stripe a nuestro objeto de plan
            plan.id_company = id_company;
            plan.stripe_product_id = stripeProduct.id;
            plan.stripe_price_id = stripePrice.id;

            // 5. Guardar el plan en NUESTRA base de datos
            const data = await Gym.createPlan(plan);
            
            return res.status(201).json({
                success: true,
                message: 'El plan se ha creado correctamente en Stripe y en la base de datos.',
                data: { 'id': data.id }
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
            const plan = req.body; // Viene con 'id', 'name', 'price', 'duration_days'
            const id_company = req.user.mi_store;
            plan.id_company = id_company;

            if (!plan.id) {
                return res.status(400).json({ success: false, message: 'Falta el ID del plan.' });
            }

            // 1. Obtener el plan ANTIGUO de nuestra BD (para los IDs de Stripe)
            const oldPlan = await Gym.findById(plan.id);
            if (!oldPlan) {
                return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
            }

            // 2. Obtener la compañía (Gimnasio) para usar su clave secreta
            const company = await User.findCompanyById(id_company);
            if (!company || !company.stripeSecretKey) {
                return res.status(400).json({ success: false, message: 'El gimnasio no tiene clave de Stripe.' });
            }
            
            const stripe = require('stripe')(company.stripeSecretKey);

            // 3. Actualizar el Producto en Stripe (solo el nombre)
            await stripe.products.update(oldPlan.stripe_product_id, {
                name: `(GYM) ${plan.name}`
            });

            // 4. Crear un NUEVO Precio (Stripe no permite editar montos)
            const stripePrice = await stripe.prices.create({
                product: oldPlan.stripe_product_id, // Usar el mismo producto
                unit_amount: (plan.price * 100).toFixed(0), 
                currency: 'mxn',
            });
            
            // 5. (Opcional) Desactivar el precio ANTIGUO
            try {
                 await stripe.prices.update(oldPlan.stripe_price_id, { active: false });
            } catch(e) {
                 console.log('Advertencia: No se pudo desactivar el precio antiguo de Stripe. Puede ignorarse.');
            }

            // 6. Asignar el ID del NUEVO precio a nuestro plan
            plan.stripe_product_id = oldPlan.stripe_product_id; // El ID del producto no cambia
            plan.stripe_price_id = stripePrice.id; // ¡Este es el ID del nuevo precio!

            // 7. Actualizar el plan en NUESTRA base de datos
            await Gym.updatePlan(plan);
            
            return res.status(200).json({
                success: true,
                message: 'Plan actualizado exitosamente en Stripe y en la base de datos.'
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

    async getMembershipsByDateRange(req, res, next) {
        try {
            const id_company = req.user.mi_store;
            const { start, end } = req.query;

            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Usuario no autorizado.' });
            }
            if (!start || !end) {
                return res.status(400).json({ success: false, message: 'Faltan las fechas de inicio o fin.' });
            }

            const data = await Gym.findMembershipsByDateRange(id_company, start, end);
            return res.status(200).json(data);

        } catch (error) {
            console.log(`Error en gymController.getMembershipsByDateRange: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener membresías por rango', error: error.message });
        }
    },
    
};
