const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

// Modelos antiguos
const User = require('../models/user');
// Modelo nuevo para Emoon
const EmoonUser = require('../models/emoonUser');
const Keys = require('./keys');

module.exports = function (passport) {

    // =========================================================
    // ESTRATEGIA 1: USUARIO GENERAL (Antigua)
    // =========================================================
    let optsUser = {};
    optsUser.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
    optsUser.secretOrKey = Keys.secretOrKey;

    passport.use('jwt', new JwtStrategy(optsUser, (jwt_payload, done) => {
        User.findById(jwt_payload.id, (err, user) => {
            if (err) return done(err, false);
            if (user) return done(null, user);
            return done(null, false);
        });
    }));

    // =========================================================
    // ESTRATEGIA 2: DEALER / COBI (Antigua)
    // =========================================================
    let optsCobi = {};
    optsCobi.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
    optsCobi.secretOrKey = Keys.secretOrKey;

    passport.use('cobi-jwt', new JwtStrategy(optsCobi, async (jwt_payload, done) => {
        try {
            const cobi = await User.findById_cobi(jwt_payload.id);
            if (cobi) return done(null, cobi);
            return done(null, false);
        } catch (error) {
            console.log("Error en Passport strategy cobi:", error);
            return done(error, false);
        }
    }));

    // =========================================================
    // ESTRATEGIA 3: PROYECTO EMOON (Nueva)
    // =========================================================
    let optsEmoon = {};
    optsEmoon.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
    optsEmoon.secretOrKey = Keys.secretOrKey;
    // Nota: Podrías usar un Keys.emoonSecret si quieres máxima separación

    passport.use('emoon-jwt', new JwtStrategy(optsEmoon, async (jwt_payload, done) => {
        try {
            // Buscamos en la nueva tabla 'emoon.emoon_users' usando el modelo dedicado
            const emoonUser = await EmoonUser.findById(jwt_payload.id);

            if (emoonUser) {
                return done(null, emoonUser); // Éxito
            } else {
                return done(null, false); // No existe en la tabla de Emoon
            }
        } catch (error) {
            console.log("Error en Passport strategy emoon:", error);
            return done(error, false);
        }
    }));
};