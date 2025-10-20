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
User.getAllDealer = () => {
    const sql = `
    SELECT 
        *
    FROM
        users_dealer
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
        balance,
	mi_store
    FROM
        users
    WHERE
        id = $1`;
    
    return db.oneOrNone(sql, id).then(user => { callback(null, user); })

}
User.findByMail = (email, callback) => {

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
        balance,
	mi_store
    FROM
        users
    WHERE
        email = $1`;
    
    return db.oneOrNone(sql, email)

}


User.findByCode = (code) => {

    const sql = `
    SELECT 

    *
        
    FROM
        codes
    WHERE
        code = $1`;
    
    return db.oneOrNone(sql, code)

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
    
    return db.manyOrNone(sql, employed)

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
	U.mi_store,
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
        U.balance,
	U.mi_store
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
	U.mi_store,
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
    U.mi_store,
    -- CORRECCIÓN: Usamos jsonb_agg + FILTER + extracción de índice (-> 0) para obtener
    -- un objeto único o NULL. Esto resuelve el error 'MAX(json) does not exist'.
    COALESCE(
        (
            jsonb_agg(
                jsonb_build_object( -- Usamos jsonb_build_object por consistencia con jsonb_agg
                    'id', C.id,
                    'name', C.name,
                    'addres', C.addres,
                    'telephone', C.telephone,
                    'logo', C.logo,
                    'state', C.state,
                    'available', C.available,
                    'type', C.type,
                    'lat', C.lat,
                    'lng', C.lng
                )
            ) FILTER (WHERE C.id IS NOT NULL) -- Solo agregamos si la compañía existe
        ) -> 0, -- Extrae el primer (y único) objeto JSON del array resultante
        '{}'::jsonb -- Devuelve un objeto vacío si no hay compañía
    ) AS company,
    -- Roles existentes
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
LEFT JOIN -- Unir la tabla company de forma opcional
    company AS C
ON
    C.user_id = U.id
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
   
    WHERE
        U.id = 4
    `
    return db.manyOrNone(sql);
}

User.getAdminsNotificationTokensDealer = () => {
    const sql = `
 SELECT
        U.notification_token
    FROM 
        users_dealer AS U
   
    WHERE
        U.id = 2722
    `
    return db.manyOrNone(sql);
}



User.getUsersMultiNotificationTokens = () => {
    const sql = `
     SELECT         
     notification_token 
     from users where notification_token != ''
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

User.createtickets = (name, active, amount, userId) => {
    const sql = `
	    INSERT INTO
	        tickets(
	            ticket_name,
	            active,
	            amount,
	            user_id
	        )
    VALUES($1, $2, $3, $4)	
    `;
    return db.oneOrNone(sql, [name, active, amount, userId]);
}

User.createticket = (id) => {
    const sql = `
	    INSERT INTO
	        tickets(
	            ticket_name,
	            active,
	            amount,
	            user_id
	        )
    VALUES('BIENVENIDO', 'ACTIVE', 50, $1)	
    `;
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

User.updateNoImage = (user) => {
    const sql = `
    UPDATE
        users
    SET
        name = $2,
        lastname = $3,
        phone = $4,
        updated_at = $5
    WHERE
        id = $1
    `;

    return db.none(sql, [
        user.id,
        user.name,
        user.lastname,
        user.phone,
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

User.deleteAccout = (idUser) => {
    const sql = `

    DELETE 
    
    FROM users 

    WHERE id = $1
    `;

    return db.none(sql,idUser);
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
       *
    FROM
      users
    WHERE
        name ILIKE $1
    `;

    return db.manyOrNone(sql, `%${name}%`);
}

User.findClientDealer = (name) => {
    const sql = `
    SELECT
       *
    FROM
      users_dealer
    WHERE
        phone ILIKE $1
    `;

    return db.manyOrNone(sql, `%${name}%`);
}

User.findByPhone = (phone) => {
    const sql = `
    SELECT
        U.id,
        U.name,
        U.phone,
        U.password,
        U.session_token,
        U.notification_token,
        U.balance
	
    FROM 
        users_dealer AS U
	
    WHERE
        U.phone = $1
    GROUP BY
        U.id
    `
    return db.oneOrNone(sql, phone);
}

User.updateToken_dealer = (id, token) => {
    const sql = `
    UPDATE
        users_dealer
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

User.create_dealer = (user) => {

    const myPasswordHashed = crypto.createHash('md5').update(user.password).digest('hex');
    user.password = myPasswordHashed;

    const sql = `
	    INSERT INTO
	        users_dealer(
	            name,
	            phone,
	            password,
	            created_at,
	            updated_at,
	     	    balance,
	   	    isadmin,
	 	    activate
	        )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `;

    return db.oneOrNone(sql, [
        user.name,
        user.phone,
        user.password,
        new Date(),
        new Date(),
	user.balance,
	false,
	true    
    ]);
}


User.findById_dealer =  (id, callback) => {
    const sql = `
    SELECT
        id,
        name,
        phone,
        password,
        session_token,
        notification_token,
        balance
    FROM
        users_dealer
    WHERE
        id = $1`;

    return db.oneOrNone(sql, id).then(user => { callback(null, user); })
}


User.selectToken_dealer = (id) => {
    const sql = `
    SELECT 
    notification_token
    FROM
        users_dealer

    WHERE
        id = $1
    `;

    return db.oneOrNone(sql, [
        id
        
    ]);
}

User.findByUserIdPhone = (id) => {
    const sql = `
    SELECT
        U.id,
        U.name,
        U.phone,
        U.password,
        U.session_token,
        U.notification_token,
        U.balance,
	U.company,
 	U.activate,
  	U.isadmin
	
    FROM 
        users_dealer AS U
    WHERE
        U.id = $1
    GROUP BY
        U.id
    `
    return db.oneOrNone(sql, id);
}


User.updateNotificationToken_dealer = (id, token) => {
    const sql = `
    UPDATE
        users_dealer
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


User.createWithImageUserAndCompany = (user, company) => {
    // 1. Hash de la contraseña
    const myPasswordHashed = crypto.createHash('md5').update(user.password).digest('hex');
    user.password = myPasswordHashed;

    // Consulta para insertar el usuario, asegurando que se devuelva el ID
    const sqlUser = `
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
        VALUES($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING id
    `;

    // Usamos la cadena de promesas para asegurar el orden de las operaciones
    return db.one(sqlUser, [
        user.email,
        user.name,
        user.lastname,
        user.phone,
        user.image,
        user.password,
        new Date(),
        new Date()
    ])
    .then(userData => {
        // 'userData' contiene el ID del usuario recién creado: { id: <user_id> }
        const newUserId = userData.id;
        
        // 2. Asignar el ID del usuario a la compañía
        company.user_id = newUserId;
        
        // 3. Consulta para insertar la compañía y DEVOLVER su ID
        const sqlCompany = `
            INSERT INTO public.company(
                name, addres, telephone, user_id, logo, state, available, type, lat, lng, wantsAppointments, cashaccept, creditcardaccepted
            )
            VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
        `;
        
        // Se usa db.one para esperar el ID de la compañía de vuelta
        return db.one(sqlCompany, [
            company.name,
            company.addres,
            company.telephone,
            company.user_id, // Usamos el ID recuperado
            company.logo,
            company.state,
            company.available,
            company.type,
            company.lat,
            company.lng,
            company.wantsAppointments,
            company.cashaccept,
            company.creditcardaccepted
        ])
        .then(companyData => {
            // 'companyData' contiene el ID de la compañía: { id: <company_id> }
            const newCompanyId = companyData.id;

            // 4. Consulta para actualizar el campo mi_store del usuario
            const sqlUpdateUser = `
                UPDATE 
                    users
                SET
                    mi_store = $1
                WHERE
                    id = $2
            `;
            
            // Ejecutamos la actualización
            return db.none(sqlUpdateUser, [
                newCompanyId,
                newUserId
            ])
            .then(() => {
                // 5. Devolver el ID del usuario al controlador para que pueda asignar los roles
                return { id: newUserId };
            });
        });
    });
};


User.getCompanyByUser = (id) => {

    const sql = `
    select * from company where user_id = $1
		`;
    
    return db.oneOrNone(sql, id)

}

User.getCompanyById = (id) => {

    const sql = `
    select * from company where id = $1
		`;
    
    return db.oneOrNone(sql, id)

}

User.getAllCompanies = () => {
    const sql = `
    SELECT 
        *
    FROM
        company
    `;

    return db.manyOrNone(sql);
}

User.getMembershipPlan = () => {
    const sql = `
    SELECT 
        *
    FROM
        membership_plans
    `;

    return db.manyOrNone(sql);
}

User.renewMembership = (company) => {
    const sql = `
    UPDATE public.company
	SET  state = $2, membership_plan= $3, membership_expires_at= $4, membership_status= $5, available = $6
	WHERE id = $1
    `;
    return db.none(sql, [
        company.id,
        company.state,
        company.membership_plan,
		company.membership_expires_at,
		company.membership_status,
		company.available
    ]);
}

User.updateCompanyStatus = (companyId, newStatus) => {
    const sql = `
   UPDATE company
	SET  state = $2
	WHERE id = $1
    `;

    return db.none(sql, [
        companyId,
        newStatus

    ]);
}


module.exports = User;
