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

            const data = await User.findByUserById(id);
            console.log(`Usuario: ${data}`);
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

    async getAll(req, res, next) {
        try {
            const data = await User.getAll();
            console.log(`Usuarios: ${data}`);
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


 async login(req, res, next) {
        try {
            const email = req.body.email;
            const password = req.body.password;
 
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
                    roles: myUser.roles
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
 
   async updateNotificationToken(req, res, next) {
        try {
            
            const body = req.body;
            console.log('Datos enviados del usuario: ', body);

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
    
    async selectToken(req, res, next) {
        try {

            const id = req.params.id;

            const data = await User.selectToken(id);
            console.log(`Usuario: ${data}`);
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
};
