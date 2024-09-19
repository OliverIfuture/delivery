const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/user');
const Keys = require('./keys');

module.exports = function(passport) {
    // Opciones para la estrategia de usuario
    let optsUser = {};
    optsUser.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
    optsUser.secretOrKey = Keys.secretOrKey;

    // Estrategia para usuarios
    passport.use('user-jwt', new JwtStrategy(optsUser, (jwt_payload, done) => {
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
    let optsDealer = {};
    optsDealer.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
    optsDealer.secretOrKey = Keys.secretOrKey;

    // Estrategia para dealers
    passport.use('dealer-jwt', new JwtStrategy(optsDealer, (jwt_payload, done) => {
        User.findById_dealer(jwt_payload.id, (err, dealer) => {
            if (err) {
                return done(err, false);
            } 
            if (dealer) {
                return done(null, dealer);
            } else {
                return done(null, false);
            } 
        });
    }));
};
