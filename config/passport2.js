const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/user');
const Keys = require('./keys');

module.exports = function(passport2) { // Cambiado a 'passport2'

    let opts = {};
    opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
    opts.secretOrKey = Keys.secretOrKey;

    passport2.use(new JwtStrategy(opts, (jwt_payload, done) => {
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
}
