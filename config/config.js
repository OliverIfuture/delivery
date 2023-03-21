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
    user: 'djomewgzclmvfm',
    host: 'ec2-3-93-160-246.compute-1.amazonaws.com',
    database: 'd2p8e37i44vdqm',
    password:'2b1374a525bfdec543198b1a250f44e95097aa45ccf441c18525aaa991ad6278',
    port: 5432,
    ssl: {
        rejectUnauthorized: false,
    },
};

const db = pgp(databaseConfig);
module.exports = db;

