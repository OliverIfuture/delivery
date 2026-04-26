const db = require('../config/config');
const crypto = require('crypto');
const keys = require('../config/keys.js'); // <-- **ESTA LÍNEA ES LA CORRECCIÓN**

const User = {};

User.getAll = () => {
    const sql = `
SELECT
    u.*,
    m.id AS membership_id,
    m.status AS membership_status,
    m.current_period_end
FROM
    users u
LEFT JOIN
    client_subscriptions m ON u.id = m.id_client;
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
    return db.manyOrNone(sql, [
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
    mi_store,
    access_level,
    id_entrenador,
    current_streak,
    last_workout_date,
    target_protein, 
    target_carbs,   
    target_fats     
FROM
    users
WHERE
    id = $1;`;

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
	mi_store,
    access_level,
	id_entrenador
    FROM
        users
    WHERE
        email = $1`;

    return db.oneOrNone(sql, email)

}


User.findByCode = (code, id) => {

    const sql = `
    SELECT 

    *
        
    FROM
        codes
    WHERE
        code = $1 and id_company = $2
		
		`;

    return db.oneOrNone(sql, [code, id])

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
    U.access_level,
    U.id_entrenador,
    U.current_streak,
    U.last_workout_date,
    U.target_protein, -- 🔥 AGREGADO
    U.target_carbs,   -- 🔥 AGREGADO
    U.target_fats,    -- 🔥 AGREGADO
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
    U.id;
    `
    return db.oneOrNone(sql, id);
}

User.findDeliveryMen = (id) => {
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
        R.id = 3  and U.mi_store = $1
    `;
    return db.manyOrNone(sql, id);
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
	U.id_entrenador,
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
                    'lng', C.lng,
					'description', C.description
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

User.updateCompanyPromo = (idCompany, status) => {
    const sql = `
    UPDATE
        company
    SET
        ispromo = $2
		WHERE
        id = $1
    `;
    return db.none(sql, [
        idCompany,
        status
    ]);
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

User.getAdminsNotificationTokens = (id) => {
    const sql = `
 SELECT
        U.notification_token
    FROM 
        users AS U
   
    WHERE
        U.id = $1
    `
    return db.manyOrNone(sql, id);
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

// En models/user.js

User.createOrUpdateInvitation = async (email, trainerId, clientId, fullName) => {
    // 1. Verificar si ya existe alguna invitación (pendiente o rechazada) para este email
    const findSql = `SELECT id FROM invitations WHERE email = $1 LIMIT 1`;
    const existingInvite = await db.oneOrNone(findSql, [email]);

    if (existingInvite) {
        // A) Si existe: La actualizamos a 'registered' y vinculamos el cliente
        const updateSql = `
            UPDATE invitations
            SET status = 'registered', 
                client_id = $2, 
                store_id = $3, -- Nos aseguramos que quede con el ID del link
                updated_at = NOW()
            WHERE id = $1
        `;
        await db.none(updateSql, [existingInvite.id, clientId, trainerId]);
        console.log(`✅ Invitación existente actualizada a REGISTERED para: ${email}`);
    } else {
        // B) Si NO existe: Creamos una nueva directamente como 'registered'
        // Esto sirve para que el entrenador vea que este usuario llegó "de la nada" (por su link)
        const insertSql = `
            INSERT INTO invitations (
                store_id, 
                email, 
                name, 
                status, 
                client_id, 
                created_at, 
                updated_at
            )
            VALUES ($1, $2, $3, 'registered', $4, NOW(), NOW())
        `;
        await db.none(insertSql, [trainerId, email, fullName, clientId]);
        console.log(`✅ Invitación automática (Referral) creada para: ${email}`);
    }
}

User.create = (user, id_entrenador) => {

    // 1. Encriptar contraseña
    const myPasswordHashed = crypto.createHash('md5').update(user.password).digest('hex');
    user.password = myPasswordHashed;

    // 2. LÓGICA DE ASIGNACIÓN (EL CAMBIO IMPORTANTE)
    // Explicación: Si user.id_entrenador tiene valor (no es null ni undefined), úsalo.
    // Si no, usa la variable 'id_entrenador' que recibimos como argumento.
    const idEntrenadorFinal = user.id_entrenador ? user.id_entrenador : id_entrenador;

    const sql = `
        INSERT INTO users(
            email,
            name,
            lastname,
            phone,
            image,
            password,
            created_at,
            updated_at,
            id_entrenador
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
    `;

    return db.one(sql, [
        user.email,
        user.name,
        user.lastname,
        user.phone,
        user.image,
        user.password,
        new Date(),
        new Date(),
        idEntrenadorFinal // <--- AQUÍ PASAMOS EL ID YA CALCULADO
    ]);
};

User.createWithImageDelivery = (user) => {

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
	            updated_at,
				mi_store
	        )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
    `;

    return db.oneOrNone(sql, [
        user.email,
        user.name,
        user.lastname,
        user.phone,
        user.image,
        user.password,
        new Date(),
        new Date(),
        user.mi_store
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

User.updateTrainerxx = (user) => {
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

User.selectTokenByCompany = (id) => {
    const sql = `
    SELECT 
    u.notification_token	FROM
        users as u
    inner join company as c
	on c.user_id = u.id

    WHERE
        c.id = $1
    `;

    return db.oneOrNone(sql, [
        id

    ]);
}


User.deleteAccout = (email) => {
    const sql = `

    DELETE 
    
    FROM users 

    WHERE email = $1
    `;

    return db.none(sql, email);
}

User.isPasswordMatched2 = (userPassword, hash) => {
    const myPasswordHashed = myPasswordHashed;
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


User.findById_dealer = (id, callback) => {
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

    // --- LÓGICA DE TRIAL GRATUITO ---
    // Calcular la fecha de expiración: Hoy + 7 días
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 20);

    // Asignamos el estado de activación
    company.state = 'ACTIVE'; // Se asume que el estado de la compañía debe ser activo para el trial.
    // ---------------------------------

    // Consulta para insertar el usuario (sin cambios)
    const sqlUser = `
        INSERT INTO
            users(
                email, name, lastname, phone, image, password, created_at, updated_at
            )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING id
    `;

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
            const newUserId = userData.id;

            // 2. Asignar el ID del usuario a la compañía
            company.user_id = newUserId;

            // 3. Consulta para insertar la compañía (¡ACTUALIZADA CON TRIAL!)
            const sqlCompany = `
            INSERT INTO public.company(
                name, addres, telephone, user_id, logo, 
                state, available, type, lat, lng, wantsappointments, 
                cashaccept, creditcardaccepted, code, points, 
                image_card, description, -- Nuevos campos de imagen y descripción
                
                -- COLUMNAS DEL TRIAL
                membership_plan,
                membership_status,
                membership_expires_at,
				"deliveryCost",
				country
            )
            VALUES(
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 
                
                -- VALORES DEL TRIAL
                'fundador', -- Valor de membership_plan (Free Trial)
                'active',   -- Valor de membership_status
                $18,         -- Valor de membership_expires_at (La fecha calculada)
                $19,
				$20
			)
            RETURNING id
        `;

            // Contamos los 17 parámetros estándar + el nuevo parámetro de fecha ($18)
            return db.one(sqlCompany, [
                company.name, // 1
                company.addres, // 2
                company.telephone, // 3
                company.user_id, // 4
                company.logo, // 5
                company.state, // 6 (Será 'ACTIVE' desde la lógica de Trial)
                company.available, // 7
                company.type, // 8
                company.lat, // 9
                company.lng, // 10
                company.wantsappointments, // 11
                company.cashaccept, // 12
                company.creditcardaccepted, // 13
                company.code, // 14
                company.points, // 15
                company.image_card, // 16
                company.description, // 17
                sevenDaysFromNow, // 18: La fecha de expiración calculada
                company.deliveryCost,
                company.country
            ])
                .then(companyData => {
                    const newCompanyId = companyData.id;

                    // 4. Actualizar mi_store en el usuario (sin cambios)
                    const sqlUpdateUser = `
                UPDATE users
                SET mi_store = $1
                WHERE id = $2
            `;

                    return db.none(sqlUpdateUser, [
                        newCompanyId,
                        newUserId
                    ])
                        .then(() => {
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


User.getClients = (id) => {

    const sql = `
SELECT 
    U.id,
    U.email,
    U.name,
    U.lastname,
    U.phone,
    U.image,
    U.notification_token,
    LastSub.status as status_plan,
    LastSub.current_period_end as finaliza
FROM 
    users AS U
INNER JOIN (
    -- Subconsulta: Trae solo la última suscripción por cada cliente
    SELECT DISTINCT ON (id_client) 
        id_client, 
        status, 
        current_period_end
    FROM client_subscriptions
    -- Ordenamos por cliente y por fecha descendente para que la primera sea la más nueva
    ORDER BY id_client, current_period_end DESC
) AS LastSub ON U.id = LastSub.id_client
WHERE 
    U.id_entrenador = $1
ORDER BY 
    U.name ASC;

		`;

    return db.manyOrNone(sql, id)

}

User.getTotalComision = (id) => {

    const sql = `
SELECT SUM(commission_amount) 
FROM affiliate_commissions 
WHERE id_company_affiliate = $1

		`;

    return db.oneOrNone(sql, id)

}

User.getMonthlyMemberships = (id) => {

    const sql = `
SELECT
    EXTRACT(MONTH FROM payment_date)::INTEGER AS month,
    COALESCE(SUM(amount), 0) AS total
FROM public.payment_history
WHERE
    id_company = $1
    AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY month
ORDER BY month ASC;

		`;

    return db.manyOrNone(sql, id)

}



User.getCompanyById = (id) => {

    const sql = `
    select 
	c.id,
	c.name,
	c.addres,
	c.telephone,
	c.user_id,
	c.state,
	c.available,
	c.type,
	c.lat,
	c.lng,
	c.wantsappointments,
	c.cashaccept,
	c.creditcardaccepted,
	c."stripeSecretKey",
	c."stripePublishableKey",
	c.membership_plan,
	c.membership_expires_at,
	c.membership_status,
	c.pos,
	c.code,
	c.points,
	c."stripeAccountId",
	c."chargesEnabled",
	c.updated_at,
	c."acceptsAffiliates",
	c."affiliateCommissionRate",
	c.image_card,
	U.notification_token,
	c.description,
	c.ispromo,
	c."deliveryCost",
	c.logo,
	c.country
		
	from company as c
	
		inner join users as U on U.id = c.user_id
	where c.id = $1
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
		order by id asc    `;

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
User.updateCompanyPaymentMethods = (company) => {
    const sql = `
    UPDATE company
	SET cashaccept= $2, 
	creditcardaccepted = $3 
	where id = $1
    `;

    return db.none(sql, [
        company.id,
        company.cashaccept,
        company.creditcardaccepted

    ]);
}

User.updateStripeKeys = (companyId, stripePublishableKey, stripeSecretKey) => {
    const sql = `
  UPDATE company
	SET   "stripeSecretKey"=$3, "stripePublishableKey"=$2
	WHERE id = $1
    `;

    return db.none(sql, [
        companyId,
        stripePublishableKey,
        stripeSecretKey
    ]);
}
User.extendMembership = (companyId, monthsToAdd) => {
    const sql = `
UPDATE public.company
SET
    -- Se establece el estado de la membresía como 'active' tras la renovación.
    membership_status = 'active',

    -- Se calcula la nueva fecha de expiración.
    membership_expires_at = (
        -- Se utiliza una sentencia CASE para decidir la fecha base para el cálculo.
        CASE
            -- SI la fecha de expiración es nula O es una fecha en el pasado...
            WHEN membership_expires_at IS NULL OR membership_expires_at < NOW()
            -- ENTONCES la nueva fecha de expiración será la fecha actual MÁS el intervalo de meses.
            THEN NOW() + ($2 * INTERVAL '1 month')
            
            -- SI NO (si la membresía aún está vigente)...
            ELSE
            -- ENTONCES la nueva fecha será la fecha de expiración existente MÁS el intervalo de meses.
            membership_expires_at + ($2 * INTERVAL '1 month')
        END
    )
WHERE
    -- La condición para asegurar que solo se actualice la empresa correcta.
    id = $1;

    `;

    return db.none(sql, [
        companyId,
        monthsToAdd
    ]);
}

User.updateCompanyDetails = (company) => {
    const sql = `

UPDATE public.company
SET
    name = $1,
    addres = $2,
    telephone = $3,
    user_id = $4,
    logo = $5,
    state = $6,
    available = $7,
    type = $8,
    lat = $9,
    lng = $10,
    wantsappointments = $11,
    cashaccept = $12,
    creditcardaccepted = $13,
    "stripeSecretKey" = $14,
    "stripePublishableKey" = $15,
    membership_plan = $16,
    membership_expires_at = $17,
    membership_status = $18,
    stripe_subscription_id = $19
WHERE
    id = $20; -- La condición para asegurar que solo se actualice la empresa correcta.

    `;

    return db.none(sql, [
        company.name,
        company.addres,
        company.telephone,
        company.user_id,
        company.logo,
        company.state,
        company.available,
        company.type,
        company.lat,
        company.lng,
        company.wantsappointments,
        company.cashaccept,
        company.creditcardaccepted,
        company.stripeSecretKey,
        company.stripePublishableKey,
        company.membership_plan,
        company.membership_expires_at,
        company.membership_status,
        company.stripe_subscription_id,
        company.id
    ]);
}

User.getByRole = (id) => {
    const sql = `
    SELECT 
        *
    FROM
        users
        WHERE mi_store = $1
    `;
    return db.manyOrNone(sql, id);
}

User.getAgoraConfig = () => {

    const sql = `
    SELECT * FROM public.agora_config where on_live = true
    ORDER BY id DESC limit 1
		`;

    return db.oneOrNone(sql)

}

User.getUpcomingEvent = () => {

    const sql = `
    SELECT * FROM public.upcoming_events 
    ORDER BY id DESC limit 1
		`;

    return db.oneOrNone(sql)

}

User.getAgoraConfigall = () => {

    const sql = `
    SELECT * FROM public.agora_config
    ORDER BY id DESC
		`;

    return db.manyOrNone(sql)

}

User.updateAgoraConfig = (agoraConfig) => {
    const sql = `
WITH main_update AS (
    -- Paso 1: Ejecuta tu actualización original en la fila seleccionada
    UPDATE agora_config
    SET 
        app_id = $2, 
        token_test = $3, 
        channel_name = $4, 
        on_live = $5, 
        image_event = $6, 
        day = $7, 
        cost = $8
    WHERE id = $1
    -- Devuelve el ID y el estado 'on_live' que acabamos de establecer
    RETURNING id, on_live 
)
-- Paso 2: Actualiza las otras filas, pero SÓLO si se cumplen las condiciones
UPDATE agora_config
SET on_live = false
WHERE
    -- Condición 1: Solo ejecuta esto SI la fila que actualizamos (main_update) se puso en 'true'
    (SELECT on_live FROM main_update) = true
    
    -- Condición 2: Y no toques la fila que acabamos de actualizar
    AND id != (SELECT id FROM main_update)
    
    -- Condición 3: Y solo actualiza las que ya estaban en 'true' (para no hacer trabajo innecesario)
    AND on_live = true;
    `;

    return db.none(sql, [
        agoraConfig.id,
        agoraConfig.app_id,
        agoraConfig.token_test,
        agoraConfig.channel_name,
        agoraConfig.on_live,
        agoraConfig.image_event,
        agoraConfig.day,
        agoraConfig.cost
    ]);
}

User.chageState = (id) => {
    const sql = `
    UPDATE
        company
    SET
        pos = false
    WHERE
        id = $1
    `;
    return db.none(sql, id);
}

User.createDiscountCode = (newCode) => {
    const sql = `
	    INSERT INTO public.codes(
	code, active, amount, id_company)  
    VALUES($1, $2, $3, $4)	
    `;
    return db.oneOrNone(sql, [
        newCode.code,
        newCode.active,
        newCode.amount,
        newCode.id_company]);
}

User.getDiscountCodesByCompany = (id) => {
    const sql = `
SELECT * FROM public.codes
where id_company = $1
ORDER BY codes_id desc  
    `;

    return db.manyOrNone(sql, id);
}

User.getByClientRealSubs = (id_client) => {
    const sql = `
        SELECT * FROM public.client_subscriptions
        WHERE id_client = $1
        ORDER BY id DESC
    `;

    return db.manyOrNone(sql, id_client);
};



User.getAllUsers = () => {
    const sql = `
        SELECT * FROM public.users
        ORDER BY id DESC
    `;

    return db.manyOrNone(sql);
};

User.createClientSubscription = (sub) => {
    const sql = `
        INSERT INTO public.client_subscriptions(
            id_client,
            id_company,
            id_plan,
            stripe_subscription_id,
            stripe_customer_id,
            status,
            current_period_end,
            temp_email,
            created_at,
            updated_at
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
    `;

    return db.oneOrNone(sql, [
        sub.id_client,
        sub.id_company,
        sub.id_plan,
        sub.stripe_subscription_id,
        sub.stripe_customer_id,
        sub.status,
        sub.current_period_end, // Puede ser null
        sub.temp_email,
        new Date(), // created_at
        new Date()  // updated_at
    ]);
};

User.updateClientSubscription = (sub) => {
    const sql = `
        UPDATE public.client_subscriptions SET
            id_plan = $2,
            stripe_subscription_id = $3,
            stripe_customer_id = $4,
            status = $5,
            current_period_end = $6,
            temp_email = $7,
            updated_at = $8
        WHERE id = $1;

        UPDATE public.users SET
            id_entrenador = 1,
            access_level = 2
        WHERE id = $9;
    `;

    return db.none(sql, [
        sub.id,                     // $1 (Esencial para el WHERE de suscripciones)
        sub.id_plan,                // $2
        sub.stripe_subscription_id, // $3
        sub.stripe_customer_id,     // $4
        sub.status,                 // $5
        sub.current_period_end,     // $6
        sub.temp_email,             // $7
        new Date(),                 // $8 (updated_at)
        sub.id_client               // $9 (Esencial para el WHERE de users)
    ]);
};


User.deleteDiscountCode = (id) => {
    const sql = `

    DELETE 
    
    FROM codes 

    WHERE codes_id = $1
    `;

    return db.none(sql, id);
}

User.createWholesaleUser = (user) => {

    const myPasswordHashed = crypto.createHash('md5').update(user.password).digest('hex');
    user.password = myPasswordHashed;

    const sql = `
	    INSERT INTO
	        users_mayoreo(
	            email,
	            name,
	            phone,
	            password,
	            created_at,
	            updated_at,
				id_company
	        )
    VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `;

    return db.oneOrNone(sql, [
        user.email,
        user.name,
        user.phone,
        user.password,
        new Date(),
        new Date(),
        user.id_company
    ]);
}

User.getWholesaleUsersByCompany = (id) => {
    const sql = `
    SELECT 
        *
    FROM
        users_mayoreo
        WHERE id_company = $1
    `;
    return db.manyOrNone(sql, id);
}

// En tu archivo models/user.js

// RECOMENDADO: Solo selecciona los datos seguros y necesarios.
User.getClientsByCompany = (id_company) => {
    const sql = `
SELECT
    U.id,
    U.email,
    U.name,
    U.lastname,
    U.phone,
    U.image,
    U.notification_token,
    LastSub.status as status_plan,
    LastSub.current_period_end as finaliza,
    U.target_calories,
    U.target_protein, -- 🔥 AGREGADO
    U.target_carbs,   -- 🔥 AGREGADO
    U.target_fats     -- 🔥 AGREGADO
FROM
    users AS U
INNER JOIN (
    -- Subconsulta: Trae solo la última suscripción por cada cliente
    SELECT DISTINCT ON (id_client)
        id_client,
        status,
        current_period_end
    FROM client_subscriptions
    -- Ordenamos por cliente y por fecha descendente para que la primera sea la más nueva
    ORDER BY id_client, current_period_end DESC
) AS LastSub ON U.id = LastSub.id_client
WHERE
    U.id_entrenador = $1
ORDER BY
    LastSub.current_period_end ASC;
        `;
    return db.manyOrNone(sql, id_company);
}

User.createInvitation = (email, id_company) => {
    const sql = `
        INSERT INTO trainer_invitations(
            client_email,
            id_company,
            status,
            created_at
        )
        VALUES($1, $2, 'pendiente', $3)
    `;
    return db.none(sql, [
        email,
        id_company,
        new Date()
    ]);
}


User.findInvitationByEmail = (email) => {
    const sql = `
        SELECT id_company, status FROM trainer_invitations
        WHERE client_email = $1 AND status = 'pendiente'
    `;
    return db.oneOrNone(sql, email);
};


User.updateInvitationStatus = (email) => {
    const sql = `
        UPDATE trainer_invitations SET status = 'aceptada'
        WHERE client_email = $1
    `;
    return db.none(sql, email);
};
User.findCompanyById = (id_company) => {
    // Asumiendo que tu tabla se llama 'company'
    // **AÑADIDAS COMILLAS DOBLES para respetar el camelCase**
    const sql = `
        SELECT
            id,
            name,
            "stripeSecretKey",
            "stripePublishableKey",
            "stripeAccountId", -- <-- NUEVO
            "chargesEnabled",   -- <-- NUEVO
			"acceptsAffiliates",
			"affiliateCommissionRate"
        FROM
            company 
        WHERE
            id = $1
    `;
    return db.oneOrNone(sql, id_company);
};

/**
 * Guarda el ID de la cuenta de Stripe (acct_...) en la DB
 */
User.updateStripeAccountId = (id_company, stripe_account_id) => {
    const sql = `
        UPDATE company
        SET "stripeAccountId" = $1, updated_at = $2
        WHERE id = $3
    `;
    return db.none(sql, [
        stripe_account_id,
        new Date(),
        id_company
    ]);
};

/**
 * Actualiza el estado de 'chargesEnabled' (lo llama el webhook o getAccountStatus)
 */
User.updateStripeDataFromAdmin = (id_company, chargesEnabled) => {
    const sql = `
        UPDATE company
        SET 
            "chargesEnabled" = $2,
            updated_at = $3
        WHERE id = $1
    `;

    return db.none(sql, [
        id_company,
        chargesEnabled,
        new Date()
    ]);
};

User.updateStripeDataFromAdminId = (id_company, accountId) => {
    const sql = `
        UPDATE company
        SET 
            "stripeAccountId" = $2,
            "stripeSecretKey" = (SELECT "stripeSecretKey" FROM company WHERE id = 4),
            "stripePublishableKey" = (SELECT "stripePublishableKey" FROM company WHERE id = 4),
            updated_at = $3
        WHERE id = $1
    `;

    return db.none(sql, [
        id_company,
        accountId,
        new Date()
    ]);
};

User.findNotificationToken = (id_user) => {
    const sql = `
        SELECT
            notification_token
        FROM
            users 
        WHERE
            id = $1
    `;
    // Usamos oneOrNone y .then para devolver solo el string del token
    return db.oneOrNone(sql, id_user)
        .then(result => {
            return (result && result.notification_token) ? result.notification_token : null;
        });
};

User.countInvitationsByCompany = (id_company) => {
    const sql = `
        SELECT COUNT(*) FROM trainer_invitations WHERE id_company = $1
    `;
    return db.one(sql, id_company);
};

// --- **NUEVAS FUNCIONES PARA EL SUPER-ADMIN** ---

/**
 * Obtiene un conteo de todos los usuarios (clientes y entrenadores)
 */
User.getTotalUsers = () => {
    const sql = `SELECT COUNT(*) FROM users`;
    return db.one(sql);
};

/**
 * Obtiene un conteo de todas las compañías (tiendas y entrenadores)
 */
User.getTotalCompanies = () => {
    const sql = `SELECT COUNT(*) FROM company`;
    return db.one(sql);
};

/**
 * Obtiene la lista completa de compañías para el panel de admin
 */


/**
 * Aprueba o suspende una compañía (cambia 'available')
 */
User.updateCompanyStatus = (id_company, status) => {
    const sql = `
        UPDATE company
        SET available = $1, updated_at = $2
        WHERE id = $3
    `;
    return db.none(sql, [status, new Date(), id_company]);
};

/**
 * Obtiene todos los ENTRENADORES disponibles para contratar
 */
User.getAvailableTrainers = () => {
    const sql = `
        SELECT
            id,
            name,
            logo,
            telephone,
			description
        FROM
            company
        WHERE
            type = 'ENTRENADOR' 
            AND available = 'true'
        ORDER BY
            id asc
    `;
    return db.manyOrNone(sql);
};

User.updateTrainer = (userId, trainerId) => {
    // Ajusta 'mi_store' o 'id_entrenador' según como se llame la columna en tu tabla 'users'
    const sql = `
        UPDATE users
        SET id_entrenador = $2, updated_at = NOW()
        WHERE id = $1
    `;
    return db.none(sql, [userId, trainerId]);
};;

User.transferClientData = (id_client, id_company) => {
    // Usamos una transacción para garantizar que ambas actualizaciones se ejecuten correctamente
    const sqlTransaction = `
        BEGIN;

        -- 1. Actualizar Client Progress Photos
        UPDATE client_progress_photos
        SET id_company = $2
        WHERE id_client = $1;

        -- 2. Actualizar Client Metrics Log
        UPDATE client_metrics_log
        SET id_company = $2
        WHERE id_client = $1;

        COMMIT;
    `;

    return db.none(sqlTransaction, [id_client, id_company]);
};

// En models/user.js

/**
 * --- NUEVA FUNCIÓN DE GAMIFICACIÓN ---
 * Actualiza la racha del usuario basándose en la fecha actual.
 */
User.updateStreak = (id_user) => {
    const sql = `
    UPDATE users
    SET 
        current_streak = CASE
            -- 1. Si ya entrenó HOY, no hacemos nada (mantiene la racha)
            WHEN last_workout_date = CURRENT_DATE THEN current_streak

            -- 2. Lógica de Flexibilidad:
            -- Si el último entreno fue hace 3 días o menos (permite 2 días vacíos en medio), suma +1.
            -- Ejemplo: Entrenó Lunes -> Hoy es Jueves (Pasaron Martes y Miércoles). Es válido.
            WHEN last_workout_date >= CURRENT_DATE - INTERVAL '3 days' THEN current_streak + 1

            -- 3. Si pasaron más de 3 días (3 días de descanso consecutivos), reinicia a 1.
            ELSE 1
        END,
        last_workout_date = CURRENT_DATE
    WHERE id = $1
    RETURNING current_streak;
    `;
    return db.one(sql, id_user);
};

User.getFree = (id_client) => {
    const sql = `

	        BEGIN;

        -- 1. Actualizar Client Progress Photos
        UPDATE client_progress_photos
        SET id_company = NULL
        WHERE id_client = $1;

        -- 2. Actualizar Client Metrics Log
        UPDATE client_metrics_log
        SET id_company = NULL
        WHERE id_client = $1;

		UPDATE
        users
        SET
        id_entrenador = NULL
        WHERE
        id = $1;

        COMMIT;
    `;
    return db.none(sql, id_client);
}

User.updateOtp = (id, otp) => {
    const sql = `
    UPDATE
        users
    SET
        session_token = $2
    WHERE
        id = $1
    `;
    return db.none(sql, [id, otp]);
}

// Actualizar Contraseña (CON HASHING MD5 INTERNO)
User.updatePasswordByEmail = (email, password) => {

    // 1. ENCRIPTAMOS AQUÍ (Dentro del Modelo)
    const myPasswordHashed = crypto.createHash('md5').update(password).digest('hex');

    const sql = `
    UPDATE
        users
    SET
        password = $2
    WHERE
        email = $1
    `;

    // 2. Enviamos la contraseña ya encriptada a la base de datos
    return db.none(sql, [email, myPasswordHashed]);
}

// En models/user.js

User.getInvitationsByStore = (id_store) => {
    const sql = `
        SELECT 
            id,
            store_id,
            client_id,
            email,
            name,
            status,
            created_at,
            updated_at
        FROM 
            invitations
        WHERE 
            store_id = $1
        ORDER BY 
            created_at DESC
    `;
    return db.manyOrNone(sql, [id_store]);
}

// En models/user.js

User.checkAndClaimInvitation = async (email, newUserId) => {
    // 1. Buscamos si hay una invitación pendiente para este email
    const findSql = `
        SELECT id, store_id 
        FROM invitations 
        WHERE email = $1 AND status = 'pending'
        LIMIT 1
    `;
    const invitation = await db.oneOrNone(findSql, [email]);

    // Si no hay invitación, no hacemos nada (retorna null)
    if (!invitation) return null;

    // 2. Si existe, hacemos el "Claim" (Reclamar invitación)
    // A) Actualizamos la tabla invitations
    const updateInviteSql = `
        UPDATE invitations
        SET status = 'registered', client_id = $2, updated_at = NOW()
        WHERE id = $1
    `;
    await db.none(updateInviteSql, [invitation.id, newUserId]);

    // B) Retornamos el store_id (ID del entrenador) para asignarlo al usuario
    return invitation.store_id;
}

User.createQuestionnaire = (email, jsonData, photos) => {
    const sql = `
        INSERT INTO user_questionnaires(
            user_email,
            questionnaire_data,
            photo_frontal,
            photo_espalda,
            photo_lateral_izq,
            photo_lateral_der,
            created_at,
            updated_at
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `;

    return db.one(sql, [
        email,
        jsonData,
        photos.frontal || null,
        photos.espalda || null,
        photos.lateral_izq || null,
        photos.lateral_der || null,
        new Date(),
        new Date()
    ]);
}

User.updateAccessLevel = (id_client, level) => {
    const sql = `
        UPDATE users 
        SET access_level = $2, updated_at = NOW() 
        WHERE id = $1
    `;
    return db.none(sql, [id_client, level]);
};


User.updateTrainerProfileData = (user, company) => {
    return db.tx(async t => {

        // --- QUERY 1: Actualizar Usuario ---
        const sqlUser = `
            UPDATE users
            SET 
                name = $1,
                phone = $2,
                image = $3,
                updated_at = $4
            WHERE id = $5
        `;

        await t.none(sqlUser, [
            user.name,
            user.phone,
            user.image,
            new Date(),
            user.id
        ]);

        // --- QUERY 2: Actualizar Compañía ---
        // Basado en los campos que enviaste: cashPayment, cardPayment, available (string 'true'/'false' en tus datos), etc.
        const sqlCompany = `
            UPDATE company
            SET 
                name = $1,
                description = $2,
                logo = $3,
                image_card = $4,  -- Verifica si en tu BD es 'company_card' o 'card_image'
                cashaccept = $5,
                creditcardaccepted = $6,
                available = $7,
                updated_at = $8
            WHERE id = $9
        `;

        await t.none(sqlCompany, [
            company.name,
            company.description,
            company.logo,
            company.image_card, // En el objeto JSON suele venir como cardImage
            company.cashaccept, // Booleano true/false
            company.creditcardaccepted, // Booleano true/false
            company.available,   // String 'true'/'false' o Booleano (según tu DB)
            new Date(),
            company.id // Ojo: Asegúrate de enviar el company.id correctamente desde Flutter o user.mi_store
        ]);

        return true;
    });
};


//////////////////          COBI    FUNCTIOS ////////////// 
User.findById_cobi = (id) => {
    const sql = `
        SELECT 
            u.id,
            u.company_id,
            u.first_name,
            u.last_name,
            u.email,
            u.phone,
            u.password_hash,
            u.role,
            u.is_available,
            u.is_authenticated,
            u.session_token,
            u.fcm_token,
            u.status,
            u.created_at,
            u.updated_at,
            json_build_object(
                'id', c.id,
                'trade_name', c.trade_name,
                'rfc', c.rfc,
                'industry', c.industry,
                'logo_url', c.logo_url,
                'country', c.country,
                'address', c.address,
                'latitude', c.latitude,
                'longitude', c.longitude,
                'pickup_notes', c.pickup_notes,
                'default_vehicle', c.default_vehicle,
                'accepts_credit_cards', c.accepts_credit_cards,
                'stripe_account_id', c.stripe_account_id,
                'stripe_charges_enabled', c.stripe_charges_enabled,
                'created_at', c.created_at,
                'updated_at', c.updated_at
            ) AS company

        FROM 
            cobi_users AS u
        INNER JOIN 
            cobi_companies AS c ON u.company_id = c.id
        WHERE 
            u.id = $1
    `;

    // Return the Promise directly. The controller's 'await' will handle it.
    return db.oneOrNone(sql, [id]);
};

User.cobicreate = async (user, companyId) => {
    // 1. Encriptar contraseña exactamente como en tu proyecto anterior (MD5)
    const myPasswordHashed = crypto.createHash('md5').update(user.password).digest('hex');
    user.password = myPasswordHashed;

    const sql = `
        INSERT INTO cobi_users(
            company_id,
            first_name,
            last_name,
            email,
            phone,
            password_hash,
            role,
            created_at,
            updated_at
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING id, first_name, last_name, email, phone, role
    `;

    // 2. Insertar en Postgres
    return db.one(sql, [
        companyId,
        user.first_name, // 🔥 CORREGIDO
        user.last_name,  // 🔥 CORREGIDO
        user.email,
        user.phone,
        user.password, // Aquí ya va la contraseña hasheada con MD5
        'ADMIN', // Rol por defecto para el que registra la empresa
        new Date(),
        new Date()
    ]);
};

User.cobicreateCompany = (company) => {
    const sql = `
        INSERT INTO cobi_companies(
            trade_name,
            rfc,
            industry,
            logo_url,
            country,
            address,
            latitude,
            longitude,
            pickup_notes,
            default_vehicle,
            accepts_credit_cards,
            stripe_account_id,
            stripe_charges_enabled,
            created_at,
            updated_at
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id
    `;

    return db.one(sql, [
        company.trade_name,             // 🔥 CORREGIDO
        company.rfc,
        company.industry,
        company.logo_url || null,       // 🔥 CORREGIDO
        company.country || 'MX',
        company.address,
        company.latitude || null,
        company.longitude || null,
        company.pickup_notes || '',     // 🔥 CORREGIDO
        company.default_vehicle || 'Moto', // 🔥 CORREGIDO
        company.accepts_credit_cards || false, // 🔥 CORREGIDO
        company.stripe_account_id || null,     // 🔥 CORREGIDO
        company.stripe_charges_enabled || false, // 🔥 CORREGIDO
        new Date(),
        new Date()
    ]);
};


User.cobifindByEmail = (email) => {
    const sql = `
    SELECT 
        u.id,
        u.company_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.password_hash,
        u.role,
        u.is_available,
        u.is_authenticated,
        u.status,
        -- Agrupamos todos los datos de la empresa en un objeto JSON llamado "company"
        json_build_object(
            'id', c.id,
            'trade_name', c.trade_name,
            'rfc', c.rfc,
            'industry', c.industry,
            'logo_url', c.logo_url,
            'country', c.country,
            'address', c.address,
            'latitude', c.latitude,
            'longitude', c.longitude,
            'accepts_credit_cards', c.accepts_credit_cards,
            'stripe_account_id', c.stripe_account_id,
            'stripe_charges_enabled', c.stripe_charges_enabled
        ) AS company
    FROM 
        cobi_users AS u
    INNER JOIN 
        cobi_companies AS c ON u.company_id = c.id
    WHERE 
        u.email = $1
    `;

    // Usamos db.oneOrNone porque puede que el email no exista
    return db.oneOrNone(sql, [email]);
};

// Y tu función de validación de password (manteniendo MD5)
User.cobiisPasswordMatched = (userPassword, hash) => {
    const myPasswordHashed = crypto.createHash('md5').update(userPassword).digest('hex');
    return myPasswordHashed === hash;
};

// Función para actualizar el token de sesión
User.cobiupdateToken = (id, token) => {
    const sql = `
        UPDATE cobi_users
        SET session_token = $2
        WHERE id = $1
    `;
    return db.none(sql, [id, token]);
};

User.cobiupdate = (company) => {
    const sql = `
    UPDATE
        cobi_companies
    SET
        trade_name = $2,
        rfc = $3,
        industry = $4,
        address = $5,
        pickup_notes = $6,
        default_vehicle = $7,
        logo_url = $8,
        latitude = $9,           -- 🔥 NUEVO
        longitude = $10,          -- 🔥 NUEVO
        updated_at = $11
    WHERE
        id = $1
    `;

    return db.none(sql, [
        company.id,              // $1
        company.trade_name,       // $2
        company.rfc,             // $3
        company.industry,        // $4
        company.address,         // $5
        company.pickup_notes,     // $6
        company.default_vehicle,  // $7
        company.logo_url,         // $8
        company.latitude,             // $9  (Asegúrate de mandar esto como número desde Flutter)
        company.longitude,             // $10
        new Date()               // $11
    ]);
}

module.exports = User;
