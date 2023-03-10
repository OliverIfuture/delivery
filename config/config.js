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
    user: 'udooplfbnrrywo',
    host: 'ec2-3-93-160-246.compute-1.amazonaws.com',
    database: 'dnetojjn38nsg',
    password: '9af4ba1201e958f242346cd7c4a59b6f262d50cdf7859048b78cfaaa962eeef6',
    port: 5432,
    ssl: {
        rejectUnauthorized: false,
    },
};

const db = pgp(databaseConfig);
module.exports = db;

