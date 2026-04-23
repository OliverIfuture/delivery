const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/user');
const Keys = require('./keys');

module.exports = function (passport) {
    // Opciones para la estrategia de usuario
    let optsUser = {};
    optsUser.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
    optsUser.secretOrKey = Keys.secretOrKey;

    // Estrategia para usuarios
    passport.use('jwt', new JwtStrategy(optsUser, (jwt_payload, done) => {
        User.findById(jwt_payload.id, (err, user) => {
            if (err) {
                return done(err, false);
            }
            if (user) {
                return done(null, user);
            } else {
                return done(null, false);
            }
        });
    }));

    // Opciones para la estrategia de dealer
    let optsCobi = {};
    optsCobi.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
    optsCobi.secretOrKey = Keys.secretOrKey;

    // Estrategia para COBI (Actualizada a Async/Await)
    passport.use('cobi-jwt', new JwtStrategy(optsCobi, async (jwt_payload, done) => {
        try {
            // Como findById_cobi ahora devuelve una Promesa, usamos 'await'
            const cobi = await User.findById_cobi(jwt_payload.id);

            if (cobi) {
                return done(null, cobi); // Autenticación exitosa, pasa al controlador
            } else {
                return done(null, false); // El token es válido, pero el usuario ya no existe
            }
        } catch (error) {
            console.log("Error en Passport strategy:", error);
            return done(error, false); // Ocurrió un error en la base de datos
        }
    }));
};
