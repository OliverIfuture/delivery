const promise = require('bluebird');
const options = {
    promiseLib: promise, 
    query:(e) => {}
}

const pgp = require('pg-promise')(options);
const types = pgp.pg.types;

types.setTypeParser(1114, function (stringValue) {
    
    return stringValue;
});

const databaseConfig = {
    user: 'ucc92k2apmdu4l',
    host:'c67tgmqjrqj9ns.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com',
    database: 'dmqjbprnl26kn',
    password:'p662a5ed74917fca059a56e30205527b6fe21c55bf108eeec67061ff94a673659',
    port: 5432,
    ssl: {
        rejectUnauthorized: false,
    },
};

const db = pgp(databaseConfig);
module.exports = db;

