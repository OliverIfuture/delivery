const db = require('../config/config');
const crypto = require('crypto');

const User = {};

User.getAll = () => {
    const sql = `
    SELECT 
        *
    FROM
        users
    `;

    return db.manyOrNone(sql);
}

User.findByState = (state) => {
    const sql = `
    SELECT 
        *
    FROM
        users
        WHERE state = $1
    `;
    return db.manyOrNone(sql,[
        state
    ]);
}

User.findById = (id, callback) => {

    const sql = `
    SELECT
        id,
        email,
        name,
        lastname,
        image,
        phone,
        password,
        session_token,
        notification_token,
        autenticated,
        is_trainer,
        document,
        gym,
        state,
        credential,
        keystore,
        balance
    FROM
        users
    WHERE
        id = $1`;
    
    return db.oneOrNone(sql, id).then(user => { callback(null, user); })

}

User.getShops = (employed) => {

    const sql = `
           select sales.id,
	   sales.name_store,
	   sales.credit_card,
	   sales.cash,
	   sales.points,
	   sales.employed,
	   sales.image_client,
	   sales.date,
	   sales.hour,
    	   sales.reference,
	   order_sales.product_name,
	   order_sales.product_price,
	   order_sales.image_product,
	   order_sales.quantity
	   
	   from sales
	   inner join order_sales on sales.reference = order_sales.reference
	   where sales.employed = $1
        `;
    
    return db.manyOrNone(sql, `%${employed}%`)

}

User.findByUserId = (id) => {
    const sql = `
    SELECT
        U.id,
        U.email,
        U.name,
        U.lastname,
        U.image,
        U.phone,
        U.password,
        U.session_token,
        U.notification_token,
        U.autenticated,
        U.is_trainer,
        U.document,
        U.gym,
        U.state,
        U.credential,
        U.keystore,
        U.balance,
        json_agg(
            json_build_object(
                'id', R.id,
                'name', R.name,
                'image', R.image,
                'route', R.route
            )
        ) AS roles
    FROM 
        users AS U
    INNER JOIN
        user_has_roles AS UHR
    ON
        UHR.id_user = U.id
    INNER JOIN
        roles AS R
    ON
        R.id = UHR.id_rol
    WHERE
        U.id = $1
    GROUP BY
        U.id
    `
    return db.oneOrNone(sql, id);
}

User.findDeliveryMen = () => {
    const sql = `
    SELECT
        U.id,
        U.email,
        U.name,
        U.lastname,
        U.image,
        U.phone,
        U.password,
        U.session_token,
        U.notification_token,
        U.autenticated,
        U.is_trainer,
        U.document,
        U.gym,
        U.state,
        U.credential,
        U.keystore,
        U.balance
    FROM
        users AS U
    INNER JOIN
        user_has_roles AS UHR
    ON 
        UHR.id_user = U.id
    INNER JOIN
        roles AS R
    ON
        R.id = UHR.id_rol
    WHERE
        R.id = 3  
    `;
    return db.manyOrNone(sql);
}

User.findByQR = (id) => {
    const sql = `
    SELECT
        U.id,
        U.email,
        U.name,
        U.lastname,
        U.image,
        U.phone,
        U.password,
        U.session_token,
        U.notification_token,
        U.autenticated,
        U.is_trainer,
        U.document,
        U.gym,        
        U.state,
        U.credential,
        U.keystore,
        U.balance,
        json_agg(
            json_build_object(
                'id', R.id,
                'name', R.name,
                'image', R.image,
                'route', R.route
            )
        ) AS roles
    FROM 
        users AS U
    INNER JOIN
        user_has_roles AS UHR
    ON
        UHR.id_user = U.id
    INNER JOIN
        roles AS R
    ON
        R.id = UHR.id_rol
    WHERE
        U.id = $1
    GROUP BY
        U.id
    `
    return db.oneOrNone(sql, id);
}

User.findByEmail = (email) => {
    const sql = `
    SELECT
        U.id,
        U.email,
        U.name,
        U.lastname,
        U.image,
        U.phone,
        U.password,
        U.session_token,
        U.notification_token,
        U.autenticated,
        U.is_trainer,
        U.document,
        U.gym,        
        U.state,
        U.credential,
        U.keystore,
        U.balance,
        json_agg(
            json_build_object(
                'id', R.id,
                'name', R.name,
                'image', R.image,
                'route', R.route
            )
        ) AS roles
    FROM 
        users AS U
    INNER JOIN
        user_has_roles AS UHR
    ON
        UHR.id_user = U.id
    INNER JOIN
        roles AS R
    ON
        R.id = UHR.id_rol
    WHERE
        U.email = $1
    GROUP BY
        U.id
    `
    return db.oneOrNone(sql, email);
}

User.updateState = (user) => {
    const sql = `
    UPDATE
        users
    SET
        is_trainer = $2,
        state = $3
    WHERE
        id = $1
    `;
    return db.none(sql, [
        user.id,
        user.is_trainer,
        user.state
    ]);
}

User.updateStateFail = (user) => {
    const sql = `
    UPDATE
        users
    SET
        is_trainer = $2,
        state = $3
    WHERE
        id = $1
    `;
    return db.none(sql, [
        user.id,
        user.is_trainer,
        user.state
    ]);
}

User.getAdminsNotificationTokens = () => {
    const sql = `
    SELECT
        U.notification_token
    FROM 
        users AS U
    INNER JOIN
        user_has_roles AS UHR
    ON
        UHR.id_user = U.id
    INNER JOIN
        roles AS R
    ON
        R.id = UHR.id_rol
    WHERE
        R.id = 2
    `
    return db.manyOrNone(sql);
}

User.getUserNotificationToken = (id) => {
    const sql = `
    SELECT
        U.notification_token
    FROM 
        users AS U
    WHERE
        U.id = $1
    `
    return db.oneOrNone(sql, id);
}

User.create = (user) => {

    const myPasswordHashed = crypto.createHash('md5').update(user.password).digest('hex');
    user.password = myPasswordHashed;

    const sql = `
    INSERT INTO
        users(
            email,
            name,
            lastname,
            phone,
            image,
            password,
            created_at,
            updated_at
        )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `;

    return db.oneOrNone(sql, [
        user.email,
        user.name,
        user.lastname,
        user.phone,
        user.image,
        user.password,
        new Date(),
        new Date()
    ]);
}

User.update = (user) => {
    const sql = `
    UPDATE
        users
    SET
        name = $2,
        lastname = $3,
        phone = $4,
        image = $5,
        updated_at = $6
    WHERE
        id = $1
    `;

    return db.none(sql, [
        user.id,
        user.name,
        user.lastname,
        user.phone,
        user.image,
        new Date()
    ]);
}

User.updateTrainer = (user) => {
    const sql = `
    UPDATE
        users
    SET
        document = $2,
        gym = $3,
        state = $4

    WHERE
        id = $1
    `;

    return db.none(sql, [
        user.id,
        user.document,
        user.gym,
        user.state
    ]);
}

User.updateAccountQr = (user) => {
    const sql = `
    UPDATE
        users
    SET
        credential = $2,
        keystore = $3

    WHERE
        id = $1
    `;

    return db.none(sql, [
        user.id,
        user.credential,
        user.keystore
    ]);
}


User.updateToken = (id, token) => {
    const sql = `
    UPDATE
        users
    SET
        session_token = $2
    WHERE
        id = $1
    `;

    return db.none(sql, [
        id,
        token
    ]);
}

User.updateNotificationToken = (id, token) => {
    const sql = `
    UPDATE
        users
    SET
        notification_token = $2
    WHERE
        id = $1
    `;

    return db.none(sql, [
        id,
        token
    ]);
}

User.updatePoints = (id, puntos) => {
    const sql = `
    UPDATE
        users
    SET
        balance = $2
    WHERE
        id = $1
    `;

    return db.none(sql, [
        id,
        puntos

    ]);
}

User.forgotPass = (email, password) => {
    const myPasswordHashed = crypto.createHash('md5').update(password).digest('hex');
    password = myPasswordHashed;
    const sql = `
    UPDATE
        users
    SET
        password = $2
    WHERE
        email = $1
    `;

    return db.none(sql, [
        email,
        password

    ]);
}

User.selectToken = (id) => {
    const sql = `
    SELECT 
    notification_token,
    is_trainer
    FROM
        users

    WHERE
        id = $1
    `;

    return db.oneOrNone(sql, [
        id
        
    ]);
}

User.deleteAccout = (id) => {
    const sql = `

    DELETE 
    
    FROM users 

    WHERE id = $1
    `;

    return db.none(sql, [
        id
        
    ]);
}

User.isPasswordMatched2 = (userPassword, hash) => {
    const myPasswordHashed = myPasswordHashed ;
    if (myPasswordHashed === hash) {
        return true;
    }
    return false;
}

User.isPasswordMatched = (userPassword, hash) => {
    const myPasswordHashed = crypto.createHash('md5').update(userPassword).digest('hex');
    if (myPasswordHashed === hash) {
        return true;
    }
    return false;
}

User.findClient = (name) => {
    const sql = `
    SELECT
        P.id,
        P.name,
        P.description,
        P.price,
        P.image1,
        P.image2,
        P.image3,
        P.id_category,
	P.stock,
	P.id_company,
	P.state,
	P.price_special,
	P.price_buy
    FROM
        products AS P
    INNER JOIN
        categories AS C
    ON
        P.id_category = C.id
    WHERE
        p.name ILIKE $2
    `;

    return db.manyOrNone(sql, [`%${name}%`]);
}

module.exports = User;
