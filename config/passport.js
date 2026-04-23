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

    // Estrategia para dealers
    passport.use('cobi-jwt', new JwtStrategy(optsCobi, (jwt_payload, done) => {
        User.findById_cobi(jwt_payload.id, (err, cobi) => {
            if (err) {
                return done(err, false);
            }
            if (cobi) {
                return done(null, cobi);
            } else {
                return done(null, false);
            }
        });
    }));
};
