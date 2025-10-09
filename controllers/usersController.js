const User = require('../models/user');
const Rol = require('../models/rol');
const jwt = require('jsonwebtoken');
const keys = require('../config/keys');
const storage = require('../utils/cloud_storage.js');
const { use } = require('passport');
const { findUserById } = require('../models/user');


module.exports = {

    async findDeliveryMan(req, res, next) {
        try {

            const data = await User.findDeliveryMen();
            console.log(`Repartidores: ${data}`);
            return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener los repartidores'
            });
        }
    },

    async findById(req, res, next) {
        try {

            const id = req.params.id;

            const data = await User.findByUserId(id);
            console.log(`Datos enviados del usuario: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener el usuario por ID'
            });
        }
    },
    async findByMail(req, res, next) {
        try {

            const email = req.params.email;

            const data = await User.findByMail(email);
            console.log(`Datos enviados del usuario: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener el usuario por ID'
            });
        }
    },
     async getShops(req, res, next) {
        try {

            const employed = req.params.employed;

            const data = await User.getShops(employed);
            console.log(`Datos enviados del usuario: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener el usuario por ID'
            });
        }
    },

        async findByState(req, res, next) {
        try {

            const state = req.params.state;

            const data = await User.findByState(state);
            console.log(`Datos enviados del usuario entrenador: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener el usuario por ID'
            });
        }
    },
    
    
async getAdminsNotificationTokens(req, res, next) {
        try {
            const data = await User.getAdminsNotificationTokens();    
            let tokens = [];


            data.forEach(d => {
                tokens.push(d.notification_token);
            });

            console.log('Tokens de admin:', tokens);
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

            console.log('Tokens de admin:', tokens);
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

            console.log('Tokens de usuarios:', tokens);
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
                succes: false,
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
                succes: false,
                message: 'error al obtener'
            });
        }
    },
    
    async register(req, res, next) {
        try {
            
            const user = req.body;
            const data = await User.create(user);

            await Rol.create(data.id, 1);//ROL POR DEFECTO CLIENE
             await User.createticket(data.id);
            return res.status(201).json({
                succes: true,
                message: 'El registro se ralizo correctamente, ahora inicia sesion',
                data: data.id
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: true,
                message: 'error con el registro del ususario',
                error: error

            });
        }
    },

            async registerWithOutImage(req, res, next) {
        try {
            
            const user = req.body;
            console.log(`Datos de usuario: ${user}`);

            const data = await User.create(user);

            await Rol.create(data.id, 1);//ROL POR DEFECTO CLIENE
            await User.createticket(data.id);
            return res.status(201).json({
                succes: true,
                message: 'El registro se ralizo correctamente, ahora inicia sesion',
                data: data.id
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: true,
                message: 'error con el registro del ususario',
                error: error

            });
        }
    },
        async registerWithImage(req, res, next) {
        try {
            
            const user = JSON.parse(req.body.user);
            console.log(`Datos de usuario: ${user}`);
            const files = req.files;

            if (files.length > 0) {
                const pathImage = `image_${Date.now()}`;
                const url = await storage(files[0], pathImage);
                
                if (url != undefined && url != null) {
                    user.image = url;

                }
            }

            const data = await User.create(user);

            await Rol.create(data.id, 1);//ROL POR DEFECTO CLIENE
            await User.createticket(data.id);
            return res.status(201).json({
                succes: true,
                message: 'El registro se ralizo correctamente, ahora inicia sesion',
                data: data.id
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: true,
                message: 'error con el registro del ususario',
                error: error

            });
        }
    },

        async updateNoImage(req, res, next) {
        try {
            
            const user = req.body;
            console.log(`Datos enviados del usuario: ${JSON.stringify(user)}`);
            const files = req.files;

            await User.update(user);

            return res.status(201).json({
                succes: true,
                message: 'Los datos del usuario se actualizaron correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: false,
                message: 'Hubo un error con la actualizacion de datos del ususario',
                error: error

            });
        }
    },
                
    async update(req, res, next) {
        try {
            
            const user = JSON.parse(req.body.user);
            console.log(`Datos enviados del usuario: ${JSON.stringify(user)}`);
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
                succes: true,
                message: 'Los datos del usuario se actualizaron correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: false,
                message: 'Hubo un error con la actualizacion de datos del ususario',
                error: error

            });
        }
    },

        async updateTrainer(req, res, next) {
        try {
            
            const user = JSON.parse(req.body.user);
            console.log(`Datos enviados del usuario: ${JSON.stringify(user)}`);
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
                succes: true,
                message: 'Los datos del usuario se actualizaron correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: false,
                message: 'Hubo un error con la actualizacion de datos del ususario',
                error: error

            });
        }
    },

           async updateAccountQr(req, res, next) {
        try {
            
            const user = JSON.parse(req.body.user);
            console.log(`Datos enviados del usuario: ${JSON.stringify(user)}`);
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
                succes: true,
                message: 'Los datos del usuario se actualizaron correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: false,
                message: 'Hubo un error con la actualizacion de datos del ususario',
                error: error

            });
        }
    },


 async login(req, res, next) {
        try {
            const email = req.body.email;
            const password = req.body.password;
                
            console.log(email); // AQUI PUEDES VER QUE DATOS ESTAS ENVIANDO
            console.log(password); // AQUI PUEDES VER QUE DATOS ESTAS ENVIANDO

 
            const myUser = await User.findByEmail(email);
 
            if (!myUser) {
                return res.status(401).json({
                    success: false,
                    message: 'El email no fue encontrado'
                });
            }
 
            if (User.isPasswordMatched(password, myUser.password)) {
                const token = jwt.sign({id: myUser.id, email: myUser.email}, keys.secretOrKey, {
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
                    mi_store: myUser.mi_store,
                    company: myUser.company
                }

                await User.updateToken(myUser.id, `JWT ${token}`);
                
             console.log(`Datos enviados del usuario: ${JSON.stringify(data)}`);

                console.log(`DATA ENVIADA ${data.roles}`); // AQUI PUEDES VER QUE DATOS ESTAS ENVIANDO
 
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
                console.log(`password enviado ${myUser.password}`);

            }
                 console.log(`password enviado ${password}`);
                console.log(`password enviado ${myUser.password}`);

            if (password === myUser.password) {
                const token = jwt.sign({id: myUser.id, email: myUser.email}, keys.secretOrKey, {
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
                
 
                console.log(`DATA ENVIADA ${data.roles}`); // AQUI PUEDES VER QUE DATOS ESTAS ENVIANDO
 
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
            console.log(`Nuevo balance: ${JSON.stringify(body)}`);

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
            console.log(`Cupon creado: ${JSON.stringify(data)}`);
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
            console.log(`Nuevo balance: ${JSON.stringify(data)}`);


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
    
        async forgotPass(req, res, next) {
        try {

            const email = req.params.email; // CLIENTE
            const password = req.params.password;
            // CLIENTE
            const data = await User.forgotPass(email, password);
            console.log(`Product to delete: ${JSON.stringify(data)}`);


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

            const idUser = req.params.idUser;
            console.log(`id usuario a eliminar $idUser`);

            const data = await User.deleteAccout(idUser);
            console.log(`Address: ${JSON.stringify(data)}`);


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
            console.log(`token enviado: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
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
            const codes = req.params.code;
            const code = await User.findByCode(codes);

            console.log(`codigo: ${code}`);

 
            if (!code) {
                return res.status(401).json({
                    success: false,
                    message: 'El codigo no fue encontrado'
                });
            }

            else{
                return res.status(201).json({
                success: true,
                message: 'codigo aplicado',
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
                const token = jwt.sign({id: myUser.id, email: myUser.email}, keys.secretOrKey, {
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
                
 
                console.log(`DATA ENVIADA ${data.roles}`); // AQUI PUEDES VER QUE DATOS ESTAS ENVIANDO
 
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
            console.log(`updateNotificationToken_dealer: ${JSON.stringify(body)}`);

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
                console.log(`Datos enviados del usuario: ${JSON.stringify(data)}`);
        
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
            console.log(`token enviado: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener el usuario por ID'
            });
        }
    },


        async findByUserIdPhone(req, res, next) {
        try {

            const id = req.params.id;

            const data = await User.findByUserIdPhone(id);
            console.log(`Datos enviados del usuario: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener el usuario por ID'
            });
        }
    },


    async register_dealer(req, res, next) {
        try {
            
            const user = req.body;
            const data = await User.create_dealer(user);
            return res.status(201).json({
                succes: true,
                message: 'El registro se ralizo correctamente, ahora inicia sesion',
                data: data.id
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: true,
                message: 'error con el registro del ususario',
                error: error

            });
        }
    },


async createWithImageUserAndCompany(req, res, next) {
    try {
        // 1. Parsear los datos JSON
        const user = JSON.parse(req.body.user);
        const company = JSON.parse(req.body.company);

        console.log(`Datos enviados del usuario: ${JSON.stringify(user)}`);
        console.log(`Datos enviados del company: ${JSON.stringify(company)}`);

        // Acceder a los archivos cargados. Multer (con upload.fields) los pone en req.files 
        // como un objeto, no como un array plano.
        const files = req.files; 
        
        // 2. Procesar la Imagen del Usuario (Campo: 'image')
        if (files.image && files.image.length > 0) {
            const userImageFile = files.image[0];
            const pathImage = `user_image_${Date.now()}`;
            const url = await storage(userImageFile, pathImage);
            
            user.image = url; // Asigna la URL de la imagen al modelo de usuario
            
        }

        // 3. Procesar el Logo de la Compañía (Campo: 'imageLogo')
        if (files.imageLogo && files.imageLogo.length > 0) {
            const companyLogoFile = files.imageLogo[0];
            const pathLogo = `company_logo_${Date.now()}`; // Nombre único para el logo
            const urlLogo = await storage(companyLogoFile, pathLogo);
            
            company.logo = urlLogo; // Asigna la URL del logo al modelo de compañía (asumo que el campo se llama 'logo')
            
        }

        // 4. Crear usuario y compañía en la base de datos
        // NOTA: Se asume que esta función en el modelo maneja la creación de ambos.
        // Asegúrate de que tu modelo 'User.createWithImageUserAndCompany' también guarde la compañía.
        const data = await User.createWithImageUserAndCompany(user, company);

        // 5. Asignación de Roles
        await Rol.create(data.id, 1); // ROL: Cliente
        await Rol.create(data.id, 2); // ROL: Repartidor
        await Rol.create(data.id, 3); // ROL: Tienda

        
        // 7. Respuesta exitosa
        return res.status(201).json({
            succes: true,
            message: 'El registro se realizó correctamente, ahora inicia sesión',
            data: data.id
        });

    }
    catch (error) {
        console.log(`Error en createWithImageUserAndCompany: ${error}`);
        return res.status(501).json({
            succes: false, // Debería ser 'false' si hubo un error.
            message: 'Error con el registro del usuario y la compañía',
            error: error
        });
    }
}

    
};
