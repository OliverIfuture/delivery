const { Client } = require('pg');


getAll = async () => {

    const client = new Client({
        user: 'udooplfbnrrywo',
        host: 'ec2-3-93-160-246.compute-1.amazonaws.com',
        database: 'dnetojjn38nsg',
        password: '9af4ba1201e958f242346cd7c4a59b6f262d50cdf7859048b78cfaaa962eeef6',
        port: 5432,
        ssl: {
            rejectUnauthorized: false,
        },
    });
    await client.connect();
 
    const res = await client.query('select * from categories');

    const result = res.rows;

    await client.end()

    return result;
}
getAll().then((result) => {

    console.log(result);
 });