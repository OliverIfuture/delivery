const User = require('../models/user');
const db = require('../config/config');
const Rol = require('../models/rol');
const jwt = require('jsonwebtoken');
const keys = require('../config/keys');
const storage = require('../utils/cloud_storage.js');
const { use } = require('passport');
const { findUserById } = require('../models/user');
const nodemailer = require('nodemailer'); // <--- IMPORTANTE

// --- CONFIGURACIÓN DEL TRANSPORTE (SMTP) ---
// Lo ideal es poner esto en un archivo de config, pero aquí funciona.
// Asegúrate de usar variables de entorno en Heroku para user y pass.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // PON TU CORREO AQUÍ O process.env.EMAIL_USER
        pass: process.env.EMAIL_PASS // LA DE 16 LETRAS. O process.env.EMAIL_PASS
    }
});

module.exports = {

    async findDeliveryMan(req, res, next) {
        try {
            const id = req.params.id;
            const data = await User.findDeliveryMen(id);
            //console.log(`Repartidores: ${data}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener los repartidores'
            });
        }
    },

    async findById(req, res, next) {
        try {

            const id = req.params.id;

            const data = await User.findByUserId(id);
            //console.log(`Datos enviados del usuario: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener el usuario por ID'
            });
        }
    },
    async findByMail(req, res, next) {
        try {

            const email = req.params.email;

            const data = await User.findByMail(email);
            //console.log(`Datos enviados del usuario: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener el usuario por ID'
            });
        }
    },
    async getShops(req, res, next) {
        try {

            const employed = req.params.employed;

            const data = await User.getShops(employed);
            // console.log(`Datos enviados del usuario: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener el usuario por ID'
            });
        }
    },

    async findByState(req, res, next) {
        try {

            const state = req.params.state;

            const data = await User.findByState(state);
            //console.log(`Datos enviados del usuario entrenador: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener el usuario por ID'
            });
        }
    },


    async getAdminsNotificationTokens(req, res, next) {
        try {
            const id = req.params.id;
            const data = await User.getAdminsNotificationTokens(id);
            let tokens = [];


            data.forEach(d => {
                tokens.push(d.notification_token);
            });

            //console.log('Tokens de admin:', tokens);
            return res.status(201).json(tokens);
        }
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener los repartidores'
            });
        }
    },

    async getAdminsNotificationTokensDealer(req, res, next) {
        try {
            const data = await User.getAdminsNotificationTokensDealer();
            let tokens = [];


            data.forEach(d => {
                tokens.push(d.notification_token);
            });

            //console.log('Tokens de admin:', tokens);
            return res.status(201).json(tokens);
        }
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener los tokens'
            });
        }
    },

    async getUsersMultiNotificationTokens(req, res, next) {
        try {
            const data = await User.getUsersMultiNotificationTokens();
            let tokens = [];


            data.forEach(d => {
                tokens.push(d.notification_token);
            });

            //console.log('Tokens de usuarios:', tokens);
            return res.status(201).json(tokens);
        }
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener los tokens de ususarios'
            });
        }
    },

    async getAll(req, res, next) {
        try {
            const data = await User.getAll();
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener'
            });
        }
    },

    async getAllDealer(req, res, next) {
        try {
            const data = await User.getAllDealer();
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener'
            });
        }
    },


    async register(req, res, next) {
        try {
            const user = req.body;

            // --- LÓGICA DE INVITACIÓN DE ENTRENADOR ---
            let id_entrenador = null;
            const invitation = await User.findInvitationByEmail(user.email);

            if (invitation) {
                // Si se encontró una invitación pendiente, asignamos el ID
                id_entrenador = invitation.id_company;
                // console.log(`Usuario ${user.email} tiene una invitación pendiente. Asignando al entrenador ID: ${id_entrenador}`);
            }
            // --- FIN LÓGICA DE INVITACIÓN ---

            // Pasamos el id_entrenador (que será null si no hay invitación)
            const data = await User.create(user, id_entrenador);

            // Asignar rol por defecto (asumimos rol 'Cliente' con id '3')
            await Rol.create(data.id, 3);

            // --- LÓGICA DE INVITACIÓN (Actualizar) ---
            if (invitation) {
                // Si se usó una invitación, la marcamos como 'aceptada'
                await User.updateInvitationStatus(user.email);
                //console.log(`Invitación para ${user.email} marcada como 'aceptada'.`);
            }
            // --- FIN LÓGICA ---

            const token = jwt.sign({ id: data.id, email: user.email }, keys.secretOrKey, {
                // expiresIn: 86400 // 1 dia
            });

            const userData = {
                id: data.id,
                name: user.name,
                lastname: user.lastname,
                email: user.email,
                phone: user.phone,
                image: user.image,
                session_token: `JWT ${token}`
            };

            return res.status(201).json({
                success: true,
                message: 'El registro se realizo correctamente',
                data: userData
            });

        }
        catch (error) {
            console.log(`Error en usersController.register: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error con el registro del usuario',
                error: error
            });
        }
    },

    async registerWithImage(req, res, next) {
        try {
            const user = JSON.parse(req.body.user);

            // ---------------------------------------------------------
            // 1. DETECTAR ID DEL ENTRENADOR (LIMPIO)
            // ---------------------------------------------------------
            // Solo miramos id_entrenador. Ignoramos mi_store para evitar cruces.
            let trainerIdFromLink = null;

            if (user.id_entrenador) {
                trainerIdFromLink = user.id_entrenador;
            }

            // 2. MANEJO DE IMAGEN
            const files = req.files;
            if (files.length > 0) {
                const path = `image_${Date.now()}`;
                const url = await storage(files[0], path);
                if (url != undefined && url != null) {
                    user.image = url;
                }
            }

            // 3. CREAR USUARIO
            // Pasamos el trainerIdFromLink (que ahora solo viene de id_entrenador)
            const data = await User.create(user, trainerIdFromLink);

            // 4. ASIGNAR ROL
            await Rol.create(data.id, 3);

            // ---------------------------------------------------------
            // 5. LÓGICA DE INVITACIONES / REFERIDOS
            // ---------------------------------------------------------

            if (!trainerIdFromLink) {
                // CASO A: Registro sin enlace. Buscamos invitación por email.
                const trainerIdFromEmail = await User.checkAndClaimInvitation(user.email, data.id);

                if (trainerIdFromEmail) {
                    await User.updateTrainer(data.id, trainerIdFromEmail);
                    console.log(`🔗 Usuario ${user.email} vinculado por EMAIL al Entrenador ${trainerIdFromEmail}`);

                    // Actualizamos data para el response
                    // Nota: Si tu DB usa la columna 'mi_store' internamente para guardar el ID, 
                    // aquí se actualiza solo para visualización, pero la lógica sigue siendo de entrenador.
                    data.mi_store = trainerIdFromEmail;
                }
            } else {
                // CASO B: Registro por Enlace Mágico.
                console.log(`🔗 Usuario ${user.email} vinculado por ENLACE DIRECTO (id_entrenador) al ID ${trainerIdFromLink}`);

                // Creamos el registro en la tabla de invitaciones para que cuente en las métricas
                await User.createOrUpdateInvitation(
                    user.email,
                    trainerIdFromLink,
                    data.id,
                    `${user.name} ${user.lastname}`
                );
            }

            // 6. GENERAR TOKEN
            const token = jwt.sign({ id: data.id, email: user.email }, keys.secretOrKey, {});

            const userData = {
                id: data.id,
                name: user.name,
                lastname: user.lastname,
                email: user.email,
                phone: user.phone,
                image: user.image,
                // Devolvemos el ID asignado (sea por link o por email)
                id_entrenador: data.mi_store || trainerIdFromLink,
                session_token: `JWT ${token}`
            };

            return res.status(201).json({
                success: true,
                message: 'El registro se realizó correctamente',
                data: userData
            });

        }
        catch (error) {
            console.log(`Error en usersController.registerWithImage: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error con el registro del usuario',
                error: error
            });
        }
    },
    async registerWithOutImage(req, res, next) {
        try {

            const user = req.body;
            //console.log(`Datos de usuario: ${user}`);

            const data = await User.create(user);

            await Rol.create(data.id, 1);//ROL POR DEFECTO CLIENE
            await User.createticket(data.id);
            return res.status(201).json({
                success: true,
                message: 'El registro se ralizo correctamente, ahora inicia sesion',
                data: data.id
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: true,
                message: 'error con el registro del ususario',
                error: error

            });
        }
    },


    async updateNoImage(req, res, next) {
        try {

            const user = req.body;
            //console.log(`Datos enviados del usuario: ${JSON.stringify(user)}`);
            const files = req.files;

            await User.update(user);

            return res.status(201).json({
                success: true,
                message: 'Los datos del usuario se actualizaron correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error con la actualizacion de datos del ususario',
                error: error

            });
        }
    },

    async update(req, res, next) {
        try {

            const user = JSON.parse(req.body.user);
            //console.log(`Datos enviados del usuario: ${JSON.stringify(user)}`);
            const files = req.files;

            if (files.length > 0) {
                const pathImage = `image_${Date.now()}`;
                const url = await storage(files[0], pathImage);

                if (url != undefined && url != null) {
                    user.image = url;

                }
            }

            await User.update(user);

            return res.status(201).json({
                success: true,
                message: 'Los datos del usuario se actualizaron correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error con la actualizacion de datos del ususario',
                error: error

            });
        }
    },

    async updateTrainer(req, res, next) {
        try {

            const user = JSON.parse(req.body.user);
            //console.log(`Datos enviados del usuario: ${JSON.stringify(user)}`);
            const files = req.files;

            if (files.length > 0) {
                const pathImage = `image_${Date.now()}`;
                const url = await storage(files[0], pathImage);

                if (url != undefined && url != null) {
                    user.document = url;

                }
            }

            await User.updateTrainer(user);

            return res.status(201).json({
                success: true,
                message: 'Los datos del usuario se actualizaron correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error con la actualizacion de datos del ususario',
                error: error

            });
        }
    },

    async updateAccountQr(req, res, next) {
        try {

            const user = JSON.parse(req.body.user);
            // console.log(`Datos enviados del usuario: ${JSON.stringify(user)}`);
            const files = req.files;

            if (files.length > 0) {
                const pathImage = `image_${Date.now()}`;
                const url = await storage(files[0], pathImage);

                if (url != undefined && url != null) {
                    user.credential = url;

                }
            }

            await User.updateAccountQr(user);

            return res.status(201).json({
                success: true,
                message: 'Los datos del usuario se actualizaron correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error con la actualizacion de datos del ususario',
                error: error

            });
        }
    },


    async login(req, res, next) {
        try {
            const email = req.body.email;
            const password = req.body.password;

            // console.log(`Email recibido: ${email}`);
            //console.log(`Password recibido: ${password}`);

            const myUser = await User.findByEmail(email);

            if (!myUser) {
                return res.status(401).json({
                    success: false,
                    message: 'El email no fue encontrado'
                });
            }

            if (User.isPasswordMatched(password, myUser.password)) {
                const token = jwt.sign(
                    {
                        id: myUser.id,
                        email: myUser.email,
                        id_entrenador: myUser.id_entrenador // <-- ¡AÑADE ESTA LÍNEA!
                    }, keys.secretOrKey, {
                    // expiresIn: (60*60*24) // 1 HORA
                    // expiresIn: (60 * 2) // 2 MINUTOS
                });
                const data = {
                    id: myUser.id,
                    name: myUser.name,
                    lastname: myUser.lastname,
                    email: myUser.email,
                    phone: myUser.phone,
                    image: myUser.image,
                    session_token: `JWT ${token}`, // REVISA QUE ESTE LLEGANDO ESTE CAMPO
                    autenticated: myUser.autenticated,
                    is_trainer: myUser.is_trainer,
                    document: myUser.document,
                    id_entrenador: myUser.id_entrenador,
                    roles: myUser.roles,
                    gym: myUser.gym,
                    state: myUser.state,
                    credential: myUser.credential,
                    keystore: myUser.keystore,
                    balance: myUser.balance,
                    mi_store: myUser.mi_store,
                    company: myUser.company
                }

                await User.updateToken(myUser.id, `JWT ${token}`);

                // CORRECCIÓN: Usamos JSON.stringify con indentación (null, 2) para ver arrays legibles
                //  console.log(`--- DATOS COMPLETOS DEL USUARIO ENVIADOS AL CLIENTE ---`);
                //  console.log(JSON.stringify(data, null, 2));

                // La línea anterior ya incluye roles y company.
                // console.log(`DATA ENVIADA ${data.roles}`); // Comentamos esta línea ya que no es legible

                return res.status(201).json({
                    success: true,
                    data: data,
                    message: '! BIENVENIDO !'
                });
            }
            else {
                return res.status(401).json({
                    success: false,
                    message: 'La contraseña es incorrecta'
                });
            }

        }
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al momento de hacer login',
                error: error
            });
        }
    },


    async loginQr(req, res, next) {
        try {
            const id = req.body.id;
            const password = req.body.password;

            const myUser = await User.findByQR(id);

            if (!myUser) {
                return res.status(401).json({
                    success: false,
                    message: 'El email no fue encontrado'
                });
                // console.log(`password enviado ${myUser.password}`);

            }
            // console.log(`password enviado ${password}`);
            // console.log(`password enviado ${myUser.password}`);

            if (password === myUser.password) {
                const token = jwt.sign({ id: myUser.id, email: myUser.email }, keys.secretOrKey, {
                    // expiresIn: (60*60*24) // 1 HORA
                    //  expiresIn: (60 * 2) // 2 MINUTOS
                });
                const data = {
                    id: myUser.id,
                    name: myUser.name,
                    lastname: myUser.lastname,
                    email: myUser.email,
                    phone: myUser.phone,
                    image: myUser.image,
                    session_token: `JWT ${token}`, // REVISA QUE ESTE LLEGANDO ESTE CAMPO
                    autenticated: myUser.autenticated,
                    is_trainer: myUser.is_trainer,
                    document: myUser.document,
                    roles: myUser.roles,
                    gym: myUser.gym,
                    state: myUser.state,
                    credential: myUser.credential,
                    keystore: myUser.keystore,
                    balance: myUser.balance,
                    mi_store: myUser.mi_store
                }

                await User.updateToken(myUser.id, `JWT ${token}`);


                // console.log(`DATA ENVIADA ${data.roles}`); // AQUI PUEDES VER QUE DATOS ESTAS ENVIANDO

                return res.status(201).json({
                    success: true,
                    data: data,
                    message: '! BIENVENIDO !'
                });
            }
            else {
                return res.status(401).json({
                    success: false,
                    message: 'La contraseña es incorrecta',
                    error: myUser.password

                });
            }

        }
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al momento de hacer login',
                error: error
            });
        }
    },

    async updateNotificationToken(req, res, next) {
        try {

            const body = req.body;
            // console.log(`Nuevo balance: ${JSON.stringify(body)}`);

            await User.updateNotificationToken(body.id, body.notification_token);

            return res.status(201).json({
                success: true,
                message: 'El token de notificaciones se ha almacenado correctamente'
            });

        }
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error con la actualizacion de datos del usuario',
                error: error
            });
        }
    },
    async logout(req, res, next) {
        try {

            const id = req.body.id;
            await User.updateToken(id, null);
            return res.status(201).json({
                success: true,
                message: '! La sesion del usuario se a cerrado correctamente !'
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al momento de cerrar sesion ',
                error: error
            });
        }

    },


    async createticket(req, res, next) {
        try {

            const name = req.params.name; // CLIENTE
            const active = req.params.active;
            const amount = req.params.amount;
            const userId = req.params.userId;
            // CLIENTE
            const data = await User.createtickets(name, active, amount, userId);
            //   console.log(`Cupon creado: ${JSON.stringify(data)}`);
            return res.status(201).json({

                success: true,
                message: 'Cupon creado',
            });


        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error contacta a soporte',
                error: error
            });
        }
    },

    async updatePoints(req, res, next) {
        try {

            const id = req.params.id; // CLIENTE
            const puntos = req.params.puntos;
            // CLIENTE
            const data = await User.updatePoints(id, puntos);
            // console.log(`Nuevo balance: ${JSON.stringify(data)}`);


            return res.status(201).json({

                success: true,
                message: 'Puntos Actualizados',
            });


        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error contacta a soporte',
                error: error
            });
        }
    },

    async sendInvitation(req, res, next) {
        try {
            // 1. Recibimos los datos desde Flutter
            const { email, clientName, trainerName, invitationLink } = req.body;

            // 2. Obtenemos el ID de la tienda/entrenador (asegúrate que tu middleware de auth llene req.user)
            const id_store = req.user.mi_store;

            // Validación de seguridad
            if (!email || !invitationLink || !id_store) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos obligatorios (email, link o store_id).'
                });
            }

            // --- PASO 1: INSERTAR EN BASE DE DATOS ---
            // Intentamos insertar. Si ya existe (por el constraint UNIQUE), saltará al catch con código 23505
            const sqlInsert = `
                INSERT INTO invitations (store_id, email, name, status, created_at)
                VALUES ($1, $2, $3, 'pending', NOW())
            `;

            // Ejecutamos la query
            await db.none(sqlInsert, [id_store, email, clientName]);

            // --- PASO 2: SI NO HUBO ERROR, PREPARAMOS EL EMAIL ---
            const mailOptions = {
                from: '"GlowUp+ Team" <oliverjdm2@gmail.com>', // Tu correo configurado
                to: email,
                subject: `💪 ${trainerName} te ha invitado a entrenar`,
                html: `
                <div style="font-family: 'Helvetica', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121212; border-radius: 10px; overflow: hidden;">
                    
                    <div style="background-color: #1E1E1E; padding: 30px; text-align: center; border-bottom: 2px solid #FFD700;">
                        <h2 style="color: #FFD700; margin: 0; text-transform: uppercase; letter-spacing: 2px;">
                            GlowUp+
                        </h2>
                        <p style="color: #888; margin: 5px 0 0 0; font-size: 12px;">ENTRENAMIENTO PROFESIONAL</p>
                    </div>
                    
                    <div style="padding: 40px 30px; text-align: center;">
                        
                        <h3 style="color: #ffffff; font-size: 24px; margin-bottom: 20px;">
                            ¡Hola ${clientName}!
                        </h3>
                        
                        <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                            El entrenador <strong style="color: #FFD700;">${trainerName}</strong> te ha invitado a unirte a su equipo exclusivo en nuestra plataforma.
                        </p>

                        <div style="background-color: #2C2C2C; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                            <p style="color: #fff; margin: 0; font-size: 14px;">
                                Tendrás acceso a tus rutinas, dietas y seguimiento de progreso directamente desde tu móvil.
                            </p>
                        </div>

                        <a href="${invitationLink}" style="display: inline-block; background-color: #FFD700; color: #000000; font-size: 16px; font-weight: bold; padding: 15px 40px; text-decoration: none; border-radius: 50px; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);">
                            ACEPTAR INVITACIÓN
                        </a>

                        <p style="color: #666; font-size: 12px; margin-top: 30px;">
                            O copia y pega este enlace en tu navegador:<br>
                            <span style="color: #FFD700;">${invitationLink}</span>
                        </p>
                    </div>

                    <div style="background-color: #000000; padding: 20px; text-align: center;">
                        <p style="color: #444; font-size: 12px; margin: 0;">
                            © 2026 GlowUp+. Todos los derechos reservados.<br>
                            Si no esperabas esta invitación, puedes ignorar este correo.
                        </p>
                    </div>
                </div>
                `
            };

            // --- PASO 3: ENVIAR EL EMAIL ---
            await transporter.sendMail(mailOptions);
            console.log(`🚀 Invitación enviada y registrada para: ${email}`);

            return res.status(200).json({
                success: true,
                message: 'Invitación enviada y registrada correctamente.'
            });

        } catch (error) {
            // --- MANEJO DE DUPLICADOS ---
            // Si PostgreSQL devuelve el código de "Unique Violation"
            if (error.code === '23505') {
                return res.status(409).json({ // 409 Conflict
                    success: false,
                    message: 'Ya enviaste una invitación a este correo anteriormente.'
                });
            }

            console.error(`Error enviando invitación: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error interno al procesar la invitación.',
                error: error.message
            });
        }
    },
    async sendDeleteOtp(req, res, next) {
        try {
            const email = req.body.email;
            const user = await User.findByMail(email);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'El correo no está registrado.'
                });
            }

            // Generar código de 6 dígitos
            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            // Guardamos el OTP en la BD (Usamos el mismo campo o lógica que recuperación)
            await User.updateOtp(user.id, otp);

            // --- ENVÍO DE CORREO DE ALERTA (ELIMINACIÓN) ---
            const mailOptions = {
                from: '"Seguridad GlowUp+" <oliverjdm2@gmail.com>', // Cambié "Soporte" por "Seguridad"
                to: email,
                subject: '⚠ ALERTA DE SEGURIDAD: Código para Eliminar Cuenta',
                html: `
                    <div style="font-family: 'Helvetica', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #D32F2F; border-radius: 10px; background-color: #fff;">
                        
                        <h2 style="color: #D32F2F; text-align: center; text-transform: uppercase;">
                            ⚠ Solicitud de Eliminación
                        </h2>
                        
                        <p style="color: #333; font-size: 16px;">Hola <b>${user.name}</b>,</p>
                        
                        <p style="color: #333; font-size: 16px; line-height: 1.5;">
                            Hemos recibido una solicitud para <b>eliminar permanentemente tu cuenta</b> y todos tus datos asociados en GlowUp+.
                        </p>

                        <div style="background-color: #FFF4F4; border-left: 5px solid #D32F2F; padding: 15px; margin: 20px 0;">
                            <p style="color: #D32F2F; font-weight: bold; margin: 0;">ADVERTENCIA:</p>
                            <p style="color: #555; margin: 5px 0 0 0; font-size: 14px;">
                                Esta acción es irreversible. Si continúas, perderás tu historial de compras, rutinas guardadas y nivel de suscripción.
                            </p>
                        </div>

                        <p style="text-align: center; color: #555;">Usa el siguiente código para confirmar la eliminación:</p>

                        <div style="text-align: center; margin: 30px 0;">
                            <span style="display: inline-block; background-color: #D32F2F; color: #fff; font-size: 28px; font-weight: bold; padding: 15px 40px; letter-spacing: 5px; border-radius: 8px;">
                                ${otp}
                            </span>
                        </div>

                        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">

                        <p style="color: #999; font-size: 13px; text-align: center;">
                            <b>¿No fuiste tú?</b> Si no solicitaste eliminar tu cuenta, alguien podría tener acceso a tus credenciales. Por favor, cambia tu contraseña inmediatamente y contacta a soporte.
                        </p>
                    </div>
                `
            };

            // Esperamos a que el correo se envíe
            await transporter.sendMail(mailOptions);
            console.log(`🚨 Correo de eliminación enviado a ${email}`);

            return res.status(200).json({
                success: true,
                message: 'Código de seguridad enviado. Revisa tu correo.'
            });

        } catch (error) {
            console.error(`Error enviando correo de eliminación: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error al enviar el código de seguridad.',
                error: error.message
            });
        }
    },

    async forgotPass(req, res, next) {
        try {

            const email = req.params.email; // CLIENTE
            const password = req.params.password;
            // CLIENTE
            const data = await User.forgotPass(email, password);
            // console.log(`Product to delete: ${JSON.stringify(data)}`);


            return res.status(201).json({

                success: true,
                message: 'CONTRASEÑA ACTUALIZADA, INICIA SESION',
            });


        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error contacta a soporte',
                error: error
            });
        }
    },

    async deleteAccout(req, res, next) {
        try {

            const email = req.params.email;
            // console.log(`id usuario a eliminar $idUser`);

            const data = await User.deleteAccout(email);
            // console.log(`Address: ${JSON.stringify(data)}`);


            return res.status(201).json({

                success: true,
                message: 'La cuenta se elimino correctamente',
            });


        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error eliminando la cuenta',
                error: error
            });
        }
    },

    async updateState(req, res, next) {
        try {

            let user = req.body;
            user.state = 'AUTORIZADO';
            user.is_trainer = 'true'
            await User.updateState(user);

            return res.status(201).json({
                success: true,
                message: 'La solicitud se actualizo correctamente',
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error al actualizar la solicitud',
                error: error
            });
        }
    },

    async updateStateFail(req, res, next) {
        try {

            let user = req.body;
            user.state = 'RECHAZADO';
            user.is_trainer = 'false'
            await User.updateState(user);

            return res.status(201).json({
                success: true,
                message: 'La solicitud se actualizo correctamente',
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error al actualizar la solicitud',
                error: error
            });
        }
    },

    async selectToken(req, res, next) {
        try {

            const id = req.params.id;

            const data = await User.selectToken(id);
            //   console.log(`token enviado: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener el usuario por ID'
            });
        }
    },


    async selectTokenByCompany(req, res, next) {
        try {

            const id = req.params.id;

            const data = await User.selectTokenByCompany(id);
            //  console.log(`token enviado: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener el usuario por ID'
            });
        }
    },

    async findClient(req, res, next) {
        try {
            const name = req.params.name; // CLIENTE
            const data = await User.findClient(name);
            return res.status(201).json(data);
        }
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: `Error al listar los clientes por filtro`,
                success: false,
                error: error
            });
        }
    },

    async findClientDealer(req, res, next) {
        try {
            const name = req.params.name; // CLIENTE
            const data = await User.findClientDealer(name);
            return res.status(201).json(data);
        }
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: `Error al listar los clientes por filtro`,
                success: false,
                error: error
            });
        }
    },

    async findByCode(req, res, next) {
        try {
            const code = req.params.code;
            const id = req.params.id;
            const data = await User.findByCode(code, id);

            console.log(`codigo: ${data}`);


            if (!code) {
                return res.status(401).json({
                    success: false,
                    message: 'El codigo no fue encontrado'
                });
            }

            else {
                return res.status(201).json(data);

            }


        }
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al momento de hacer login',
                error: error
            });
        }
    },






    async login_dealer(req, res, next) {
        try {
            const phone = req.body.phone;
            const password = req.body.password;

            const myUser = await User.findByPhone(phone);

            if (!myUser) {
                return res.status(401).json({
                    success: false,
                    message: 'El email no fue encontrado'
                });
            }

            if (User.isPasswordMatched(password, myUser.password)) {
                const token = jwt.sign({ id: myUser.id, email: myUser.email }, keys.secretOrKey, {
                    // expiresIn: (60*60*24) // 1 HORA
                    //  expiresIn: (60 * 2) // 2 MINUTOS
                });
                const data = {
                    id: myUser.id,
                    name: myUser.name,
                    phone: myUser.phone,
                    session_token: `JWT ${token}`, // REVISA QUE ESTE LLEGANDO ESTE CAMPO
                    balance: myUser.balance,
                    mi_store: myUser.mi_store
                }

                await User.updateToken_dealer(myUser.id, `JWT ${token}`);


                //console.log(`DATA ENVIADA ${data.roles}`); // AQUI PUEDES VER QUE DATOS ESTAS ENVIANDO

                return res.status(201).json({
                    success: true,
                    data: data,
                    message: '! BIENVENIDO !'
                });
            }
            else {
                return res.status(401).json({
                    success: false,
                    message: 'La contraseña es incorrecta'
                });
            }

        }
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al momento de hacer login',
                error: error
            });
        }
    },

    async updateNotificationToken_dealer(req, res, next) {
        try {

            const body = req.body;
            //  console.log(`updateNotificationToken_dealer: ${JSON.stringify(body)}`);

            await User.updateNotificationToken_dealer(body.id, body.notification_token);

            return res.status(201).json({
                success: true,
                message: 'El token de notificaciones se ha almacenado correctamente'
            });

        }
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error con la actualizacion de datos del usuario',
                error: error
            });
        }
    },

    async findById_dealer(req, res, next) {
        try {
            const id = req.params.id;

            const data = await User.findById_dealer(id);
            // console.log(`Datos enviados del usuario: ${JSON.stringify(data)}`);

            if (!data) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            return res.status(200).json(data); // Cambiar a 200 para respuesta exitosa
        } catch (error) {
            console.error(`error: ${error}`); // Usar console.error para errores
            return res.status(500).json({
                success: false,
                message: 'Error al obtener el usuario por ID'
            });
        }
    },



    async selectToken_dealer(req, res, next) {
        try {

            const id = req.params.id;

            const data = await User.selectToken_dealer(id);
            // console.log(`token enviado: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener el usuario por ID'
            });
        }
    },


    async findByUserIdPhone(req, res, next) {
        try {

            const id = req.params.id;

            // const data = await User.findByUserIdPhone(id);
            console.log(`Datos enviados del usuario: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener el usuario por ID'
            });
        }
    },


    async register_dealer(req, res, next) {
        try {

            const user = req.body;
            const data = await User.create_dealer(user);
            return res.status(201).json({
                success: true,
                message: 'El registro se ralizo correctamente, ahora inicia sesion',
                data: data.id
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: true,
                message: 'error con el registro del ususario',
                error: error

            });
        }
    },

    async getCompanyById(req, res, next) {
        try {
            const id = req.params.id;

            const data = await User.getCompanyById(id);
            // console.log(`Datos enviados del getCompanyById: ${JSON.stringify(data)}`);

            if (!data) {
                return res.status(404).json({ success: false, message: 'company no encontrado' });
            }

            return res.status(200).json(data); // Cambiar a 200 para respuesta exitosa
        } catch (error) {
            console.error(`error: ${error}`); // Usar console.error para errores
            return res.status(500).json({
                success: false,
                message: 'Error al obtener el company por ID'
            });
        }
    },

    async getClients(req, res, next) {
        try {
            const id = req.params.id;

            const data = await User.getClients(id);
            // console.log(`Datos enviados del getClients: ${JSON.stringify(data)}`);

            if (!data) {
                return res.status(404).json({ success: false, message: 'company no encontrado' });
            }

            return res.status(200).json(data); // Cambiar a 200 para respuesta exitosa
        } catch (error) {
            console.error(`error: ${error}`); // Usar console.error para errores
            return res.status(500).json({
                success: false,
                message: 'Error al obtener el company por ID'
            });
        }
    },

    async getMonthlyMemberships(req, res, next) {
        try {
            const id = req.params.id;

            const data = await User.getMonthlyMemberships(id);
            // console.log(`Datos enviados del getMonthlyMemberships: ${JSON.stringify(data)}`);

            if (!data) {
                return res.status(404).json({ success: false, message: 'company no encontrado' });
            }

            return res.status(200).json(data); // Cambiar a 200 para respuesta exitosa
        } catch (error) {
            console.error(`error: ${error}`); // Usar console.error para errores
            return res.status(500).json({
                success: false,
                message: 'Error al obtener el company por ID'
            });
        }
    },


    async getTotalComision(req, res, next) {
        try {
            const id = req.params.id;

            const data = await User.getTotalComision(id);
            // console.log(`Datos enviados del getTotalComision: ${JSON.stringify(data)}`);

            if (!data) {
                return res.status(404).json({ success: false, message: 'company no encontrado' });
            }

            return res.status(200).json(data); // Cambiar a 200 para respuesta exitosa
        } catch (error) {
            console.error(`error: ${error}`); // Usar console.error para errores
            return res.status(500).json({
                success: false,
                message: 'Error al obtener el company por ID'
            });
        }
    },
    async createWithImageUserAndCompany(req, res, next) {
        try {
            // 1. Parsear los datos JSON
            const user = JSON.parse(req.body.user);
            const company = JSON.parse(req.body.company);

            // console.log(`Datos enviados del usuario: ${JSON.stringify(user)}`);
            //console.log(`Datos enviados del company: ${JSON.stringify(company)}`);

            const files = req.files;

            // 2. Procesar la Imagen del Usuario
            if (files.image && files.image.length > 0) {
                const userImageFile = files.image[0];
                const pathImage = `user_image_${Date.now()}`;
                const url = await storage(userImageFile, pathImage);
                user.image = url;
            }

            // 3. Procesar el Logo de la Compañía
            if (files.imageLogo && files.imageLogo.length > 0) {
                const companyLogoFile = files.imageLogo[0];
                const pathLogo = `company_logo_${Date.now()}`;
                const urlLogo = await storage(companyLogoFile, pathLogo);
                company.logo = urlLogo;
            }

            // 4. **¡NUEVO! Procesar la Imagen de Portada (Card)**
            if (files.imageCard && files.imageCard.length > 0) {
                const companyCardFile = files.imageCard[0];
                const pathCard = `company_card_${Date.now()}`;
                const urlCard = await storage(companyCardFile, pathCard);
                company.image_card = urlCard; // Asignamos la URL al objeto
            }

            // 5. Crear usuario y compañía en la base de datos
            const data = await User.createWithImageUserAndCompany(user, company);

            // 6. Asignación de Roles
            if (company.wantsappointments === true) {
                // console.log('Asignando roles para negocio de SERVICIOS.');
                await Rol.create(data.id, 1); // Cliente
                await Rol.create(data.id, 4); // Servicio/Consultorio
            } else {
                // console.log('Asignando roles para negocio de TIENDA.');
                await Rol.create(data.id, 1); // Cliente
                await Rol.create(data.id, 2); // Repartidor
                await Rol.create(data.id, 3); // Tienda
            }

            return res.status(201).json({
                success: true,
                message: 'El registro se realizó correctamente, ahora inicia sesión',
                data: data.id
            });

        }
        catch (error) {
            // console.log(`Error en createWithImageUserAndCompany: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error con el registro del usuario y la compañía',
                error: error
            });
        }
    },

    async getAllCompanies(req, res, next) {
        try {
            const data = await User.getAllCompanies();
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener'
            });
        }
    },


    async getMembershipPlan(req, res, next) {
        try {
            const data = await User.getMembershipPlan();
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener'
            });
        }
    },

    async renewMembership(req, res, next) {
        try {

            const company = req.body;
            //  console.log(`Datos enviados del company: ${JSON.stringify(company)}`);
            await User.renewMembership(company);

            return res.status(201).json({
                success: true,
                message: 'membresia actualizada correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error con la actualizacion de la membresia',
                error: error

            });
        }
    },


    async updateCompanyStatus(req, res, next) {
        try {

            const companyId = req.params.companyId;
            const newStatus = req.params.newStatus;
            // console.log(`datos de actualizacion:companyId = $companyId , newStatus: $newStatus`);

            await User.updateCompanyStatus(companyId, newStatus);

            return res.status(201).json({
                success: true,
                message: 'status de empresa actualizado'
            });

        }
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error con la actualizacion de datos de la empresa',
                error: error
            });
        }
    },


    async updateCompanyPaymentMethods(req, res, next) {
        try {

            const company = req.body;
            //  console.log(`Datos enviados del updateCompanyPaymentMethods: ${JSON.stringify(company)}`);
            await User.updateCompanyPaymentMethods(company);

            return res.status(201).json({
                success: true,
                message: 'medios de pago actualizados correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error con la actualizacion de los medios de pago',
                error: error

            });
        }
    },

    async updateStripeKeys(req, res, next) {
        try {

            const companyId = req.params.companyId;
            const publishableKey = req.params.publishableKey;
            const secretKey = req.params.secretKey;
            // console.log(`datos de actualizacion:companyId = ${companyId} ,publishableKey: ${publishableKey}, secretKey :${secretKey}`);

            await User.updateStripeKeys(companyId, publishableKey, secretKey);

            return res.status(201).json({
                success: true,
                message: 'ctualizando llaves de Stripe confirmado'
            });

        }
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error con la actualizacion de datos de Stripe',
                error: error
            });
        }
    },


    async updateCompanyDetails(req, res, next) {
        try {

            const company = req.body;
            // console.log(`Datos enviados del updateCompanyDetails: ${JSON.stringify(company)}`);
            await User.updateCompanyDetails(company);

            return res.status(201).json({
                success: true,
                message: 'empresa actualizada correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error con la actualizacion de la empresa',
                error: error

            });
        }
    },



    async updateCompanyPromo(req, res, next) {
        try {

            const idCompany = req.params.idCompany;
            const status = req.params.status;
            await User.updateCompanyPromo(idCompany, status);

            return res.status(201).json({
                success: true,
                message: 'Precios de promo activados',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error con la actualizacion',
                error: error

            });
        }
    },



    async extendMembership(req, res, next) {
        try {

            const companyId = req.params.companyId;
            const monthsToAdd = req.params.monthsToAdd;
            // console.log(`datos de actualizacion:companyId = $companyId ,monthsToAdd: monthsToAdd`);

            await User.extendMembership(companyId, monthsToAdd);

            return res.status(201).json({
                success: true,
                message: 'meses agregados correctamente'
            });

        }
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error con la actualizacion de datos de meses',
                error: error
            });
        }
    },


    async createWithImageDelivery(req, res, next) {
        try {

            const user = JSON.parse(req.body.user);
            // console.log(`Datos de usuario: ${user}`);
            const files = req.files;

            if (files.length > 0) {
                const pathImage = `image_${Date.now()}`;
                const url = await storage(files[0], pathImage);

                if (url != undefined && url != null) {
                    user.image = url;

                }
            }

            const data = await User.createWithImageDelivery(user);

            await Rol.create(data.id, 1);//ROL POR DEFECTO CLIENE
            await Rol.create(data.id, 3);//ROL POR DEFECTO DELIVERY
            return res.status(201).json({
                success: true,
                message: 'Delivery creado correctamente',
                data: data.id
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: true,
                message: 'error con el registro del ususario',
                error: error

            });
        }
    },

    async getByRole(req, res, next) {
        try {

            const id = req.params.id;

            const data = await User.getByRole(id);
            // console.log(`Datos enviados de los delivery: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener los delivery por ID'
            });
        }
    },

    async getAgoraConfig(req, res, next) {
        try {

            const data = await User.getAgoraConfig();
            // console.log(`Datos enviados de los getAgoraConfig: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener los getAgoraConfig'
            });
        }
    },

    async getUpcomingEvent(req, res, next) {
        try {

            const data = await User.getUpcomingEvent();
            // console.log(`Datos enviados de los getUpcomingEvent: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener los getUpcomingEvent'
            });
        }
    },



    async getAgoraConfigall(req, res, next) {
        try {

            const data = await User.getAgoraConfigall();
            //  console.log(`Datos enviados de los getAgoraConfig: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener los getAgoraConfig'
            });
        }
    },


    async updateAgoraConfig(req, res, next) {
        try {

            const agoraConfig = req.body;
            // console.log(`Datos enviados del updateAgoraConfig: ${JSON.stringify(agoraConfig)}`);
            await User.updateAgoraConfig(agoraConfig);

            return res.status(201).json({
                success: true,
                message: 'live actualizado correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error con la actualizacion del live',
                error: error

            });
        }
    },

    async getByCompany(req, res, next) {
        try {
            const id = req.params.id;
            const data = await User.getByCompany(id);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener'
            });
        }
    },


    async chageState(req, res, next) {
        try {

            const id = req.params.id;
            // console.log(`Nuevo balance: ${id}`);

            await User.chageState(id);

            return res.status(201).json({
                success: true,
                message: 'El token de notificaciones se ha almacenado correctamente'
            });

        }
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error con la actualizacion de datos del usuario',
                error: error
            });
        }
    },

    async createDiscountCode(req, res, next) {
        try {

            const newCode = req.body;
            console.log(`Datos de usuario: ${newCode}`);

            const data = await User.createDiscountCode(newCode);
            return res.status(201).json({
                success: true,
                message: 'El codigo se creo correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: true,
                message: 'error con el registro del codigo',
                error: error

            });
        }
    },

    async getDiscountCodesByCompany(req, res, next) {
        try {

            const id = req.params.id;
            const data = await User.getDiscountCodesByCompany(id);
            // console.log(`Datos enviados de los getDiscountCodesByCompany: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener los codigos'
            });
        }
    },

    async deleteDiscountCode(req, res, next) {
        try {

            const id = req.params.id;
            const data = await User.deleteDiscountCode(id);
            return res.status(201).json({
                success: true,
                message: 'el codigo se elimino correctamente',
            });


        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error eliminando el codigo',
                error: error
            });
        }
    },
    // En tu controlador de Node.js (ej. UsersController.js)

    async filesupload(req, res, next) {
        try {
            // 1. Obtener los archivos (gracias a multer)
            const files = req.files;

            // 2. Validar que se envió un archivo
            if (!files || files.length == 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No se envió ningún archivo',
                });
            }

            // 3. Obtener el path de los parámetros de la URL
            const path = req.params.pathName; // ej: 'ad_banners'

            // **CAMBIO 1: Definir la variable 'file'**
            const file = files[0];

            // 4. Crear un nombre único para el archivo en el storage
            const pathImage = `${path}/${Date.now()}_${file.originalname}`;

            // 5. Llamar a tu función de storage
            const url = await storage(file, pathImage);

            // 6. **CAMBIO 2: Mover la lógica de respuesta DENTRO del try/catch**
            //    Validar que la subida fue exitosa
            if (url != undefined && url != null) {
                // 7. **RESPUESTA EXITOSA**
                // Devolver la URL en el campo 'data' para que ResponseApi.fromJson() la lea
                return res.status(201).json({
                    success: true,
                    message: 'Imagen subida correctamente',
                    data: url // <-- ¡AQUÍ ESTÁ LA URL!
                });
            } else {
                return res.status(501).json({
                    success: false,
                    message: 'Error al subir la imagen al servidor',
                });
            }

        } catch (error) {
            console.log(`Error en filesupload: ${error}`); // 'filesupload' en lugar de 'uploadImage'
            return res.status(501).json({
                success: false,
                message: 'Error interno del servidor al subir la imagen',
                error: error
            });
        }
    },

    async createWholesaleUser(req, res, next) {
        try {

            const user = req.body;
            // console.log(`Datos de usuario: ${user}`);

            const data = await User.createWholesaleUser(user);
            return res.status(201).json({
                success: true,
                message: 'Usuario de mayoreo registrado',
                data: data.id
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'error con el registro del ususario',
                error: error

            });
        }
    },



    async getWholesaleUsersByCompany(req, res, next) {
        try {

            const id = req.params.id;

            const data = await User.getWholesaleUsersByCompany(id);
            // console.log(`Datos enviados de los mayoreo clientes: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener los delivery por ID'
            });
        }
    },




    async getClientsByCompany(req, res, next) {
        try {
            const id_company = req.params.id_company;
            const data = await User.getClientsByCompany(id_company);
            // console.log(`getClientsByCompany: ${data}`);
            return res.status(201).json(data);


        }
        catch (error) {

            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener los repartidores'
            });
        }
    },

    async inviteClient(req, res, next) {
        try {
            const email = req.body.email;
            const id_company = req.user.mi_store; // ID del entrenador (viene del token JWT)

            if (!email || !id_company) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos (email o id de compañía)'
                });
            }

            // (Opcional) Verificar si el usuario ya existe y ya tiene un entrenador
            const existingUser = await User.findByEmail(email);
            if (existingUser && existingUser.id_entrenador) {
                return res.status(409).json({ // 409 Conflict
                    success: false,
                    message: 'Este usuario ya está asignado a un entrenador.'
                });
            }

            // Crear la invitación en la nueva tabla
            await User.createInvitation(email, id_company);

            // (Lógica futura: enviar un email real al cliente)

            return res.status(201).json({
                success: true,
                message: `Invitación enviada a ${email}. Se registrará cuando el usuario cree su cuenta.`
            });
        }
        catch (error) {
            console.log(`Error en usersController.inviteClient: ${error}`);
            // Manejar error de "ya existe" (UNIQUE constraint)
            if (error.code === '23505') {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe una invitación pendiente para este email.'
                });
            }
            return res.status(501).json({
                success: false,
                message: 'Error al crear la invitación',
                error: error
            });
        }
    },

    async getAvailableTrainers(req, res, next) {
        try {
            const data = await User.getAvailableTrainers();
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en getAvailableTrainers: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener entrenadores',
                error: error
            });
        }
    },

    async generateAccessQr(req, res, next) {
        try {
            // 1. Passport (middleware) ya validó el token de sesión.
            //    El usuario autenticado está en 'req.user'.
            //    'req.user' contiene el payload del token de sesión (ej. {id: '...', email: '...'})
            const idClient = req.user.id;

            if (!idClient) {
                return res.status(401).json({
                    success: false,
                    message: 'Error de autenticación, no se encontró ID'
                });
            }

            // 2. Crear el PAYLOAD para el token de CORTA DURACIÓN.
            //    Solo necesitamos el ID para que el Kiosco lo verifique.
            const payload = {
                id: idClient
                // Podemos añadir un 'type' si queremos diferenciarlo
                // type: 'qr_access_token' 
            };

            // 3. Firmar el nuevo token con una expiración CORTA (ej. 60 segundos)
            const token = jwt.sign(payload, keys.secretOrKey, {
                expiresIn: '60s' // 60 segundos
            });

            // 4. Enviar el nuevo token de corta duración a la app del cliente
            //    (Este es el formato que espera el ClientAccessQrController en Flutter)
            return res.status(200).json({
                success: true,
                token: token,
                message: 'Token de acceso generado'
            });

        } catch (error) {
            console.log(`Error en generateAccessQr: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al generar el token de acceso',
                error: error
            });
        }
    },

    // (Dentro de module.exports)

    async filesuploadPdf(req, res, next) {
        try {
            // Con upload.array('imageFile'), req.files es un ARRAY: [ fileObject ]
            const files = req.files;

            //console.log('Archivos procesando:', files ? files.length : 0);

            if (!files || files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Error: No se recibió ningún archivo o el nombre del campo no es "imageFile".',
                });
            }

            // CAMBIO CLAVE: Accedemos directamente al índice 0 del array
            const file = files[0];

            // Crear ruta de guardado
            const path = req.params.pathName; // ej: 'diet_files'
            const pathImage = `${path}/${Date.now()}_${file.originalname}`;

            // Subir a storage (Firebase/AWS/Cloudinary)
            const url = await storage(file, pathImage);

            if (url != undefined && url != null) {
                return res.status(201).json({
                    success: true,
                    message: 'Archivo PDF/Imagen subido correctamente',
                    data: url // Devolvemos la URL para que Flutter la guarde
                });
            } else {
                return res.status(501).json({
                    success: false,
                    message: 'Error interno al guardar el archivo en la nube',
                });
            }

        } catch (error) {
            console.log(`Error en filesuploadPdf: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error interno del servidor',
                error: error
            });
        }
    },

    async sendOtp(req, res, next) {
        try {
            const email = req.body.email;
            const user = await User.findByMail(email);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'El correo no está registrado.'
                });
            }

            // Generar código de 6 dígitos
            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            // Guardamos el OTP en la BD
            await User.updateOtp(user.id, otp);

            // --- ENVÍO DE CORREO REAL ---
            const mailOptions = {
                from: '"Soporte GlowUp+" <oliverjdm2@gmail.com>', // Nombre que ve el usuario
                to: email,
                subject: 'Recuperación de Contraseña',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #000; text-align: center;">Recuperar Contraseña</h2>
                        <p style="color: #555; font-size: 16px;">Hola <b>${user.name}</b>,</p>
                        <p style="color: #555; font-size: 16px;">Usa el siguiente código para restablecer tu contraseña. Este código expirará pronto.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <span style="display: inline-block; background-color: #000; color: #fff; font-size: 24px; font-weight: bold; padding: 15px 30px; letter-spacing: 5px; border-radius: 5px;">
                                ${otp}
                            </span>
                        </div>
                        <p style="color: #999; font-size: 12px; text-align: center;">Si no solicitaste este cambio, ignora este correo.</p>
                    </div>
                `
            };

            // Esperamos a que el correo se envíe
            await transporter.sendMail(mailOptions);
            console.log(`✅ Correo enviado a ${email}`);

            return res.status(200).json({
                success: true,
                message: 'Código enviado a tu correo.'
            });

        } catch (error) {
            console.error(`Error enviando correo: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error al enviar el correo electrónico.',
                error: error.message
            });
        }
    },

    // 2. VERIFICAR CÓDIGO OTP
    async verifyOtp(req, res, next) {
        try {
            const { email, otp } = req.body;
            const user = await User.findByMail(email);

            if (!user) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
            }

            // Validamos si el código coincide con el guardado en session_token
            if (user.session_token !== otp) {
                return res.status(401).json({
                    success: false,
                    message: 'El código es incorrecto.'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Código verificado.'
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al verificar código.',
                error: error
            });
        }
    },

    // 3. RESTABLECER CONTRASEÑA
    async resetPassword(req, res, next) {
        try {
            const { email, password } = req.body;

            // AQUÍ ESTÁ EL CAMBIO: 
            // Pasamos la contraseña PLANA ("123456"). El modelo se encargará de hacer el Hash MD5.
            await User.updatePasswordByEmail(email, password);

            return res.status(200).json({
                success: true,
                message: 'Contraseña actualizada correctamente.'
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al actualizar la contraseña.',
                error: error
            });
        }
    },

    async updateTrainerProfile(req, res, next) {
        console.log("\n================== 🟢 INICIO REQUEST NODE: UPDATE TRAINER 🟢 ==================");

        try {
            // ---------------------------------------------------------
            // 1. INSPECCIÓN DE DATOS CRUDOS
            // ---------------------------------------------------------
            console.log("1. Inspecting Request Body:");
            // No imprimimos todo el string JSON si es muy largo, solo confirmamos que llegó
            console.log("   - req.body.user present?", req.body.user ? "YES" : "NO");
            console.log("   - req.body.company present?", req.body.company ? "YES" : "NO");

            // 1. Parsear los datos de texto
            let user, company;
            try {
                user = JSON.parse(req.body.user);
                company = JSON.parse(req.body.company);

                console.log("2. Data Parsed Successfully:");
                console.log(`   - User ID: ${user.id} | Name: ${user.name}`);
                console.log(`   - Company ID: ${company.id} | Name: ${company.name}`);
                console.log(`   - Switches -> Available: ${company.available}, Cash: ${company.cashPayment}, Card: ${company.cardPayment}`);
            } catch (parseError) {
                console.log("❌ Error parsing JSON body:", parseError);
                throw new Error("Invalid JSON format in user or company fields");
            }

            // ---------------------------------------------------------
            // 2. INSPECCIÓN DE ARCHIVOS
            // ---------------------------------------------------------
            const files = req.files;
            console.log("3. Inspecting Files:");
            if (files) {
                console.log("   - Keys found:", Object.keys(files));
                console.log("   - Image (Profile):", files['image'] ? "YES" : "NO");
                console.log("   - ImageLogo:", files['imageLogo'] ? "YES" : "NO");
                console.log("   - ImageCard:", files['imageCard'] ? "YES" : "NO");
            } else {
                console.log("   - No files object in request.");
            }

            // ---------------------------------------------------------
            // 3. SUBIDA DE IMÁGENES
            // ---------------------------------------------------------

            // A. Foto de Perfil (campo 'image')
            if (files && files['image'] && files['image'].length > 0) {
                console.log("   -> Uploading Profile Image...");
                const path = `user_image_${Date.now()}`;
                const url = await storage(files['image'][0], path);
                console.log("      URL Generated:", url);

                if (url) user.image = url;
            }

            // B. Logo de Empresa (campo 'imageLogo')
            if (files && files['imageLogo'] && files['imageLogo'].length > 0) {
                console.log("   -> Uploading Company Logo...");
                const path = `company_logo_${Date.now()}`;
                const url = await storage(files['imageLogo'][0], path);
                console.log("      URL Generated:", url);

                if (url) company.logo = url;
            }

            // C. Portada de Empresa (campo 'imageCard')
            if (files && files['imageCard'] && files['imageCard'].length > 0) {
                console.log("   -> Uploading Company Cover...");
                const path = `company_card_${Date.now()}`;
                const url = await storage(files['imageCard'][0], path);
                console.log("      URL Generated:", url);

                // NOTA: Asegúrate de usar la propiedad correcta que espera tu Modelo SQL
                if (url) company.image_card = url;
            }

            // ---------------------------------------------------------
            // 4. ACTUALIZACIÓN EN DB
            // ---------------------------------------------------------
            console.log("4. Executing Database Update...");
            await User.updateTrainerProfileData(user, company);
            console.log("✅ Database Update Successful");

            console.log("================== 🏁 FIN REQUEST NODE 🏁 ==================\n");

            return res.status(201).json({
                success: true,
                message: 'Perfil y configuración actualizados correctamente'
            });

        } catch (error) {
            console.log("\n❌ ERROR EN UPDATE TRAINER CONTROLLER ❌");
            console.log("Error details:", error);
            console.log("============================================================\n");

            return res.status(501).json({
                success: false,
                message: 'Error al actualizar el perfil',
                error: error
            });
        }
    },

    // En controllers/usersController.js

    async getInvitations(req, res, next) {
        try {
            const id_store = req.params.id; // Recibe el ID de la URL

            if (!id_store) {
                return res.status(400).json({
                    success: false,
                    message: 'Falta el parámetro ID de la tienda.'
                });
            }

            // Llamamos al modelo
            const data = await User.getInvitationsByStore(id_store);

            // Respondemos con la lista pura (array) como espera Flutter
            return res.status(200).json(data);

        } catch (error) {
            console.error(`Error obteniendo invitaciones: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener las invitaciones',
                error: error
            });
        }
    },

    async submitQuestionnaire(req, res, next) {
        try {
            // 1. Parsear el JSON crudo que viene desde Flutter
            const dataObj = JSON.parse(req.body.data);
            const email = dataObj.user_email;

            // 2. Manejo de Imágenes (Subida a Firebase/AWS)
            const files = req.files || {};
            const photosUrls = {
                frontal: null,
                espalda: null,
                lateral_izq: null,
                lateral_der: null
            };

            // Multer con upload.fields devuelve un objeto de arrays: { frontal: [file], espalda: [file] }
            if (files['frontal'] && files['frontal'].length > 0) {
                photosUrls.frontal = await storage(files['frontal'][0], `quest_front_${Date.now()}`);
            }
            if (files['espalda'] && files['espalda'].length > 0) {
                photosUrls.espalda = await storage(files['espalda'][0], `quest_back_${Date.now()}`);
            }
            if (files['lateral_izq'] && files['lateral_izq'].length > 0) {
                photosUrls.lateral_izq = await storage(files['lateral_izq'][0], `quest_left_${Date.now()}`);
            }
            if (files['lateral_der'] && files['lateral_der'].length > 0) {
                photosUrls.lateral_der = await storage(files['lateral_der'][0], `quest_right_${Date.now()}`);
            }

            // 3. Limpiamos el nodo "photos" crudo del JSON para no guardar datos duplicados en la BD
            delete dataObj.photos;

            // 4. Guardar en Base de Datos usando el Modelo
            const savedData = await User.createQuestionnaire(email, JSON.stringify(dataObj), photosUrls);

            return res.status(201).json({
                success: true,
                message: 'El cuestionario se ha guardado exitosamente',
                data: savedData.id
            });

        } catch (error) {
            console.log(`Error en usersController.submitQuestionnaire: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error al guardar el cuestionario',
                error: error
            });
        }
    },

};
