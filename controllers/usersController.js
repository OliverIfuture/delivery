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
            const id = req.params.id;
            const data = await User.findDeliveryMen(id);
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
            
        console.log(`Email recibido: ${email}`);
        console.log(`Password recibido: ${password}`);

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
            console.log(`--- DATOS COMPLETOS DEL USUARIO ENVIADOS AL CLIENTE ---`);
            console.log(JSON.stringify(data, null, 2));

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

            else{
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

    async getCompanyById(req, res, next) {
            try {
                const id = req.params.id;
        
                const data = await User.getCompanyById(id);
                console.log(`Datos enviados del getCompanyById: ${JSON.stringify(data)}`);
        
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

            console.log(`Datos enviados del usuario: ${JSON.stringify(user)}`);
            console.log(`Datos enviados del company: ${JSON.stringify(company)}`);

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

            // 4. Crear usuario y compañía en la base de datos
            const data = await User.createWithImageUserAndCompany(user, company);

            // 5. **ASIGNACIÓN DE ROLES CONDICIONAL (LÓGICA ACTUALIZADA)**
            // Se comprueba si la compañía es para agendar citas.
            if (company.wantsappointments === true) {
                // Si es de tipo consulta/servicio, se asignan los roles de Cliente y Servicio.
                console.log('Asignando roles para negocio de SERVICIOS.');
                await Rol.create(data.id, 1); // ROL: Cliente
                await Rol.create(data.id, 4); // ROL: Servicio/Consultorio (se asume que el ID es 4)
            } else {
                // Si es de tipo tienda, se asignan los roles originales.
                console.log('Asignando roles para negocio de TIENDA.');
                await Rol.create(data.id, 1); // ROL: Cliente
                await Rol.create(data.id, 2); // ROL: Repartidor
                await Rol.create(data.id, 3); // ROL: Tienda
            }

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
                succes: false,
                message: 'Error con el registro del usuario y la compañía',
                error: error
            });
        }
    }  ,


            async getAllCompanies(req, res, next) {
        try {
            const data = await User.getAllCompanies();
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


            async getMembershipPlan(req, res, next) {
        try {
            const data = await User.getMembershipPlan();
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
    
          async renewMembership(req, res, next) {
        try {
            
            const company = req.body;
            console.log(`Datos enviados del company: ${JSON.stringify(company)}`);
            await User.renewMembership(company);

            return res.status(201).json({
                succes: true,
                message: 'membresia actualizada correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: false,
                message: 'Hubo un error con la actualizacion de la membresia',
                error: error

            });
        }
    },


   async updateCompanyStatus(req, res, next) {
        try {
            
            const companyId = req.params.companyId;
            const newStatus = req.params.newStatus;
            console.log(`datos de actualizacion:companyId = $companyId , newStatus: $newStatus`);

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
            console.log(`Datos enviados del updateCompanyPaymentMethods: ${JSON.stringify(company)}`);
            await User.updateCompanyPaymentMethods(company);

            return res.status(201).json({
                succes: true,
                message: 'medios de pago actualizados correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: false,
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
            console.log(`datos de actualizacion:companyId = ${companyId} ,publishableKey: ${publishableKey}, secretKey :${secretKey}`);

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
            console.log(`Datos enviados del updateCompanyDetails: ${JSON.stringify(company)}`);
            await User.updateCompanyDetails(company);

            return res.status(201).json({
                succes: true,
                message: 'empresa actualizada correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: false,
                message: 'Hubo un error con la actualizacion de la empresa',
                error: error

            });
        }
    },

       async extendMembership(req, res, next) {
        try {
            
            const companyId = req.params.companyId;
            const monthsToAdd = req.params.monthsToAdd;
            console.log(`datos de actualizacion:companyId = $companyId ,monthsToAdd: monthsToAdd`);

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
            console.log(`Datos de usuario: ${user}`);
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
                succes: true,
                message: 'Delivery creado correctamente',
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

        async getByRole(req, res, next) {
        try {

            const id = req.params.id;

            const data = await User.getByRole(id);
            console.log(`Datos enviados de los delivery: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener los delivery por ID'
            });
        }
    },

            async getAgoraConfig(req, res, next) {
        try {

            const data = await User.getAgoraConfig();
            console.log(`Datos enviados de los getAgoraConfig: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener los getAgoraConfig'
            });
        }
    },


               async getAgoraConfigall(req, res, next) {
        try {

            const data = await User.getAgoraConfigall();
            console.log(`Datos enviados de los getAgoraConfig: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener los getAgoraConfig'
            });
        }
    },


        async updateAgoraConfig(req, res, next) {
        try {
            
            const agoraConfig = req.body;
            console.log(`Datos enviados del updateAgoraConfig: ${JSON.stringify(agoraConfig)}`);
            await User.updateAgoraConfig(agoraConfig);

            return res.status(201).json({
                succes: true,
                message: 'live actualizado correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: false,
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
                succes: false,
                message: 'error al obtener'
            });
        }
    },


       async chageState(req, res, next) {
        try {
            
            const id = req.params.id;
            console.log(`Nuevo balance: ${id}`);

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
                succes: true,
                message: 'El codigo se creo correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: true,
                message: 'error con el registro del codigo',
                error: error

            });
        }
    },   

           async getDiscountCodesByCompany(req, res, next) {
        try {

            const id = req.params.id;
            const data = await User.getDiscountCodesByCompany(id);
            console.log(`Datos enviados de los getDiscountCodesByCompany: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
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
                succes: false,
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
            succes: false,
            message: 'Error interno del servidor al subir la imagen',
            error: error
        });
    }
},

            async createWholesaleUser(req, res, next) {
        try {
            
            const user = req.body;
            console.log(`Datos de usuario: ${user}`);

            const data = await User.createWholesaleUser(user);
            return res.status(201).json({
                succes: true,
                message: 'Usuario de mayoreo registrado',
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
    

    
        async getWholesaleUsersByCompany(req, res, next) {
        try {

            const id = req.params.id;

            const data = await User.getWholesaleUsersByCompany(id);
            console.log(`Datos enviados de los mayoreo clientes: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener los delivery por ID'
            });
        }
    },



    
    async getClientsByCompany(req, res, next) {
        try {
            const id_company = req.params.id_company;
            const data = await User.getClientsByCompany(id_company);
            console.log(`getClientsByCompany: ${data}`);
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
    }
};
