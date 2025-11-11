const db = require('../config/config');

const Order = {};


Order.findByStatus = (status, id_order_company) => {

    const sql = `
  SELECT 
        O.id,
        O.id_client,
        O.id_address,
        O.id_delivery,
        O.status,
        O.timestamp,
        O.payMethod,
	O.hour_program,
  	O.discounts,
        O.comments,
        O.code,
        O.extra,
	O.total_extra,
 	O.drone_id,
    O.lat,
	O.lng,
       COALESCE( JSON_AGG(
            DISTINCT jsonb_build_object(
				
                'id', P.id,
                'name', P.name,
                'description', P.description,
                'price', P.price,
		'price_special', P.price_special,
                'image1', P.image1,
                'image2', P.image2,
                'image3', P.image3,
                'quantity', OHP.quantity
            )
        ) FILTER (where P.name != ''), '[]') AS products,
       COALESCE( JSON_AGG(
            DISTINCT jsonb_build_object(
                'id', M.id,
                'name', M.name,
                'description', M.description,
                'price', M.price,
		'price_special', M.price_special,
                'image1', M.image1,
                'image2', M.image2,
                'image3', M.image3,
				'carbs', M.carbs,
				'protein', M.protein,
				'calorias', M.calorias,
                'quantity', OHPP.quantity
            )
        ) FILTER (where M.name != ''), '[]') AS plates,
        JSON_BUILD_OBJECT(
            'id', U.id,
            'name', U.name,
            'lastname', U.lastname,
            'phone', U.phone,
     	    'is_trainer', U.is_trainer,
            'image', U.image,
	    'notification_token',U.notification_token
        ) AS client,
		JSON_BUILD_OBJECT(
            'id', U2.id,
            'name', U2.name,
            'lastname', U2.lastname,
            'phone', U2.phone,
            'image', U2.image
        ) AS delivery,
        JSON_BUILD_OBJECT(
            'id', A.id,
            'address', A.address,
            'neighborhood', A.neighborhood,
            'lat', A.lat,
            'lng', A.lng
        ) AS address
    FROM 
        orders AS O
    INNER JOIN
        users AS U
    ON
        O.id_client = U.id
	LEFT JOIN
		users AS U2
	ON
		O.id_delivery = U2.id
    INNER JOIN
        address AS A
    ON
        A.id = O.id_address
		
    INNER JOIN
        order_has_products AS OHP
    ON
        OHP.id_order = O.id

    left JOIN
        products AS P
    ON
        P.id = OHP.id_product
		
		
	INNER JOIN 	
		order_has_products_plates as OHPP
	ON
	
		OHPP.id_order = O.id		
	
	left JOIN 
		plates AS M
	ON 	
	  OHPP.id_plate = M.id
		
    WHERE
        status = $1 and O.id_order_company = $2
    GROUP BY
        O.id, U.id, A.id, U2.id
    ORDER BY O.id desc
    `;

    return db.manyOrNone(sql, [status, id_order_company]);

}

Order.findByDeliveryAndStatus = (id_delivery, status) => {

    const sql = `
    SELECT 
        O.id,
        O.id_client,
        O.id_address,
        O.id_delivery,
        O.status,
        O.timestamp,
        O.payMethod,
	O.hour_program,
 	O.discounts,
        O.comments,
        O.code,
	O.extra,
  	O.total_extra,
   	O.drone_id,
	    O.lat,
	O.lng,
       COALESCE( JSON_AGG(
            DISTINCT jsonb_build_object(
                'id', P.id,
                'name', P.name,
                'description', P.description,
                'price', P.price,
		'price_special',P.price_special,
                'image1', P.image1,
                'image2', P.image2,
                'image3', P.image3,
                'quantity', OHP.quantity
            )
        ) FILTER (where P.name != ''), '[]') AS products,
       COALESCE( JSON_AGG(
            DISTINCT jsonb_build_object(
                'id', M.id,
                'name', M.name,
                'description', M.description,
                'price', M.price,
		'price_special', M.price_special,
                'image1', M.image1,
                'image2', M.image2,
                'image3', M.image3,
				'carbs', M.carbs,
				'protein', M.protein,
				'calorias', M.calorias,
                'quantity', OHP.quantity
            )
        ) FILTER (where M.name != ''), '[]') AS plates,
        JSON_BUILD_OBJECT(
            'id', U.id,
            'name', U.name,
            'lastname', U.lastname,
            'phone', U.phone,
     	    'is_trainer', U.is_trainer,
            'image', U.image
        ) AS client,
		JSON_BUILD_OBJECT(
            'id', U2.id,
            'name', U2.name,
            'lastname', U2.lastname,
            'phone', U2.phone,
            'image', U2.image
        ) AS delivery,
        JSON_BUILD_OBJECT(
            'id', A.id,
            'address', A.address,
            'neighborhood', A.neighborhood,
            'lat', A.lat,
            'lng', A.lng
        ) AS address
    FROM 
        orders AS O
    INNER JOIN
        users AS U
    ON
        O.id_client = U.id
	LEFT JOIN
		users AS U2
	ON
		O.id_delivery = U2.id
    INNER JOIN
        address AS A
    ON
        A.id = O.id_address
    INNER JOIN
        order_has_products AS OHP
    ON
        OHP.id_order = O.id
    
    left JOIN
        products AS P
    ON
        P.id = OHP.id_product
		
		INNER JOIN 	
		order_has_products_plates as OHPP
	ON
	
		OHPP.id_order = O.id		
	
	left JOIN 
		plates AS M
	ON 	
	  OHPP.id_plate = M.id
	  
    WHERE
        O.id_delivery = $1 AND status = $2 
    GROUP BY
        O.id, U.id, A.id, U2.id
			ORDER BY O.id desc

    `;

    return db.manyOrNone(sql, [id_delivery, status]);

}


Order.findByClient = (id_client) => {

    const sql = `
    SELECT 
        O.id,
        O.id_client,
        O.id_address,
        O.id_delivery,
        O.status,
        O.timestamp,
	O.payMethod,
	O.hour_program,
        O.lat,
        O.lng,
	O.discounts,
        O.comments,
        O.code,
	O.extra,
  	O.total_extra,
   	O.drone_id,
	    O.lat,
	O.lng,
       COALESCE( JSON_AGG(
            DISTINCT jsonb_build_object(
                'id', P.id,
                'name', P.name,
                'description', P.description,
                'price', P.price,
		'price_special', P.price_special,
                'image1', P.image1,
                'image2', P.image2,
                'image3', P.image3,
                'quantity', OHP.quantity
            )
        ) FILTER (where P.name != ''), '[]') AS products,
       COALESCE( JSON_AGG(
            DISTINCT jsonb_build_object(
                'id', M.id,
                'name', M.name,
                'description', M.description,
                'price', M.price,
		'price_special', M.price_special,
                'image1', M.image1,
                'image2', M.image2,
                'image3', M.image3,
				'carbs', M.carbs,
				'protein', M.protein,
				'calorias', M.calorias,
                'quantity', OHP.quantity
            )
        ) FILTER (where M.name != ''), '[]') AS plates,
        JSON_BUILD_OBJECT(
            'id', U.id,
            'name', U.name,
            'lastname', U.lastname,
            'phone', U.phone,
	    'is_trainer', U.is_trainer,
            'image', U.image
        ) AS client,
		JSON_BUILD_OBJECT(
            'id', U2.id,
            'name', U2.name,
            'lastname', U2.lastname,
            'phone', U2.phone,
            'image', U2.image
        ) AS delivery,
        JSON_BUILD_OBJECT(
            'id', A.id,
            'address', A.address,
            'neighborhood', A.neighborhood,
            'lat', A.lat,
            'lng', A.lng
        ) AS address
    FROM 
        orders AS O
    INNER JOIN
        users AS U
    ON
        O.id_client = U.id
	LEFT JOIN
		users AS U2
	ON
		O.id_delivery = U2.id
    INNER JOIN
        address AS A
    ON
        A.id = O.id_address
    INNER JOIN
        order_has_products AS OHP
    ON
        OHP.id_order = O.id
	
    left JOIN
        products AS P
    ON
        P.id = OHP.id_product
	
	INNER JOIN 	
		order_has_products_plates as OHPP
	ON
	
		OHPP.id_order = O.id		
	
	left JOIN 
		plates AS M
	ON 	
	  OHPP.id_plate = M.id
	  
    WHERE
        O.id_client = $1 AND (status != 'ENTREGADO') AND (status != 'CANCELADO') 
    GROUP BY
        O.id, U.id, A.id, U2.id
	ORDER BY O.id desc
    `;

    return db.manyOrNone(sql, [id_client]);

}
Order.getByClientAndStatusWeb = (id_client) => {

    const sql = `
        SELECT 
        O.id,
        O.id_client,
        O.id_address,
        O.id_delivery,
        O.status,
        O.timestamp,
	O.payMethod,
	O.hour_program,
        O.lat,
        O.lng,
	O.discounts,
        O.comments,
        O.code,
	O.extra,
 	O.total_extra,
   	O.drone_id,
	    O.lat,
	O.lng,
       COALESCE( JSON_AGG(
            DISTINCT jsonb_build_object(
                'id', P.id,
                'name', P.name,
                'description', P.description,
                'price', P.price,
		'price_special', P.price_special,
                'image1', P.image1,
                'image2', P.image2,
                'image3', P.image3,
                'quantity', OHP.quantity
            )
        ) FILTER (where P.name != ''), '[]') AS products,
       COALESCE( JSON_AGG(
            DISTINCT jsonb_build_object(
                'id', M.id,
                'name', M.name,
                'description', M.description,
                'price', M.price,
		'price_special', M.price_special,
                'image1', M.image1,
                'image2', M.image2,
                'image3', M.image3,
				'carbs', M.carbs,
				'protein', M.protein,
				'calorias', M.calorias,
                'quantity', OHPP.quantity
            )
        ) FILTER (where M.name != ''), '[]') AS plates,
        JSON_BUILD_OBJECT(
            'id', U.id,
            'name', U.name,
            'lastname', U.lastname,
            'phone', U.phone,
	    'is_trainer', U.is_trainer,
            'image', U.image
        ) AS client,
		JSON_BUILD_OBJECT(
            'id', U2.id,
            'name', U2.name,
            'lastname', U2.lastname,
            'phone', U2.phone,
            'image', U2.image
        ) AS delivery,
        JSON_BUILD_OBJECT(
            'id', A.id,
            'address', A.address,
            'neighborhood', A.neighborhood,
            'lat', A.lat,
            'lng', A.lng
        ) AS address
    FROM 
        orders AS O
    INNER JOIN
        users AS U
    ON
        O.id_client = U.id
	LEFT JOIN
		users AS U2
	ON
		O.id_delivery = U2.id
    INNER JOIN
        address AS A
    ON
        A.id = O.id_address
    INNER JOIN
        order_has_products AS OHP
    ON
        OHP.id_order = O.id
    left JOIN
        products AS P
    ON
        P.id = OHP.id_product
	INNER JOIN 	
		order_has_products_plates as OHPP
	ON
	
		OHPP.id_order = O.id		
	
	left JOIN 
		plates AS M
	ON 	
	  OHPP.id_plate = M.id
	  
    WHERE
        O.id_client = $1
    GROUP BY
        O.id, U.id, A.id, U2.id
		order by O.id desc
    `;

    return db.manyOrNone(sql, [id_client]);

}
Order.findByClientAndStatus = (id_client, status) => {

    const sql = `
        SELECT 
        O.id,
        O.id_client,
        O.id_address,
        O.id_delivery,
        O.status,
        O.timestamp,
	O.payMethod,
	O.hour_program,
        O.lat,
        O.lng,
	O.discounts,        
        O.comments,
        O.code,
	o.extra,
  	O.total_extra,
   	O.drone_id,
	    O.lat,
	O.lng,
       COALESCE( JSON_AGG(
            DISTINCT jsonb_build_object(
                'id', P.id,
                'name', P.name,
                'description', P.description,
                'price', P.price,
		'price_special', P.price_special,
                'image1', P.image1,
                'image2', P.image2,
                'image3', P.image3,
                'quantity', OHP.quantity
            )
        ) FILTER (where P.name != ''), '[]') AS products,
       COALESCE( JSON_AGG(
            DISTINCT jsonb_build_object(
                'id', M.id,
                'name', M.name,
                'description', M.description,
                'price', M.price,
		'price_special', M.price_special,
                'image1', M.image1,
                'image2', M.image2,
                'image3', M.image3,
				'carbs', M.carbs,
				'protein', M.protein,
				'calorias', M.calorias,
                'quantity', OHP.quantity
            )
        ) FILTER (where M.name != ''), '[]') AS plates,
        JSON_BUILD_OBJECT(
            'id', U.id,
            'name', U.name,
            'lastname', U.lastname,
            'phone', U.phone,
	    'is_trainer', U.is_trainer,
            'image', U.image
        ) AS client,
		JSON_BUILD_OBJECT(
            'id', U2.id,
            'name', U2.name,
            'lastname', U2.lastname,
            'phone', U2.phone,
            'image', U2.image
        ) AS delivery,
        JSON_BUILD_OBJECT(
            'id', A.id,
            'address', A.address,
            'neighborhood', A.neighborhood,
            'lat', A.lat,
            'lng', A.lng
        ) AS address
    FROM 
        orders AS O
    INNER JOIN
        users AS U
    ON
        O.id_client = U.id
	LEFT JOIN
		users AS U2
	ON
		O.id_delivery = U2.id
    INNER JOIN
        address AS A
    ON
        A.id = O.id_address
    INNER JOIN
        order_has_products AS OHP
    ON
        OHP.id_order = O.id
     
    left JOIN
        products AS P
    ON
        P.id = OHP.id_product
	INNER JOIN 	
		order_has_products_plates as OHPP
	ON
	
		OHPP.id_order = O.id		
	
	left JOIN 
		plates AS M
	ON 	
	  OHPP.id_plate = M.id
	  
    WHERE
        O.id_client = $1 AND status = $2 
    GROUP BY
        O.id, U.id, A.id, U2.id
		order by O.id desc
    `;

    return db.manyOrNone(sql, [id_client, status]);

}

Order.create = (order) => {
    const sql = `
    INSERT INTO
        orders(
            id_client,
            id_address,
            status,
            timestamp,
            created_at,
            updated_at,
            paymethod,
            hour_program,
	        comments,
	        discounts,
            extra,
	        total_extra,
            drone_id,
	        id_order_company,
	        lat,
	 	    lng,
	        affiliate_referral_id




        )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,$13, $14, $15, $16, $17) RETURNING id
    `;

    return db.oneOrNone(sql, [
        order.id_client,
        order.id_address,
        order.status,
        Date.now(),
        new Date(),
        new Date(),
        order.paymethod,
        order.hour_program,
	    order.comments,    
        order.discounts,
	    order.extra,    
	    order.total_extra,
	    order.drone_id,
	    order.id_order_company,
		order.lat,
		order.lng,
        order.affiliate_referral_id 

    ]);
}


Order.updateCode = (id, code) => {
    const sql = `
    UPDATE
        orders
    SET
        code = $2
    WHERE
        id = $1
    `;
    return db.none(sql, [
        id,
        code
    ]);
}

Order.update = (order) => {
    const sql = `
    UPDATE
        orders
    SET
        id_client = $2,
        id_address = $3,
        id_delivery = $4,
        status = $5,
        updated_at = $6
    WHERE
        id = $1
    `;
    return db.none(sql, [
        order.id,
        order.id_client,
        order.id_address,
        order.id_delivery,
        order.status,
        new Date()
    ]);
}

Order.updateLatLng = (order) => {
    const sql = `
    UPDATE
        orders
    SET
        lat = $2,
        lng = $3
    WHERE
        id = $1
    `;
    return db.none(sql, [
        order.id,
        order.lat,
        order.lng
    ]);
}

Order.cancelOrder = (order) => {
    const sql = `
    UPDATE
        orders
    SET
        id_client = $2,
        status = $3
		WHERE
        id = $1
    `;
    return db.none(sql, [
        order.id,
        order.id_client,
        order.status
    ]);
}


Order.createSale = (sales) => {
    const sql = `
    INSERT INTO
    
sales(
    name_store,
    cash,
    credit_card,
    points,
    date,
    total,
    employed,
    is_trainer,
    image_client,
    reference,
    hour,
    shift_ref,
	client_name,
	client_id,
	status
        )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11,$12, $13, $14, $15) RETURNING id
    `;

    return db.oneOrNone(sql, [
    sales.name_store,
    sales.cash,
    sales.credit_card,
    sales.points,
    sales.date,
    sales.total,
    sales.employed,
    sales.is_trainer,
    sales.image_client,
    sales.reference,
    sales.hour,
    sales.shift_ref,
	sales.client_name,
	sales.client_id	,
	sales.status	
    ]);
}

Order.selectOrder = (date, shift_ref ) => {
    const sql = `
 SELECT 
        S.id,
        S.name_store,
        S.cash,
        S.credit_card,
        S.points,
        S.date,
        S.total,
        S.employed,
        S.is_trainer,
        S.image_client,
        S.reference,	
	S.hour,
        S.shift_ref,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', P.id,
                'product_name', P.product_name,
                'product_price', P.product_price,
                'image_product', P.image_product,
		'product_coast', P.product_coast,
                'reference', P.reference,
		'quantity', P.quantity
            )
        ) AS productsOrder

    FROM 
        sales AS S
    INNER JOIN
        order_sales AS P
    ON
        P.reference = S.reference where S.date = $1 and S.shift_ref = $2
       GROUP BY
        S.id
	ORDER BY S.id ASC
    `;
    return db.manyOrNone(sql, [
	    		  date, 
			  shift_ref
    			]);
}

Order.selectOrderAll = (date ) => {
    const sql = `
 SELECT 
        S.id,
        S.name_store,
        S.cash,
        S.credit_card,
        S.points,
        S.date,
        S.total,
        S.employed,
        S.is_trainer,
        S.image_client,
        S.reference,	
	S.hour,
        S.shift_ref,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', P.id,
                'product_name', P.product_name,
                'product_price', P.product_price,
                'image_product', P.image_product,
		'product_coast', P.product_coast,
                'reference', P.reference,
		'quantity', P.quantity
            )
        ) AS productsOrder

    FROM 
        sales AS S
    INNER JOIN
        order_sales AS P
    ON
        P.reference = S.reference where S.date = $1
       GROUP BY
        S.id
	ORDER BY S.id desc
    `;
    return db.manyOrNone(sql, date);
}

Order.ClientOrdersGet = (shift_ref ) => {
    const sql = `
SELECT 
        S.id,
		S.client_id,
		S.client_name,
        S.name_store,
        S.cash,
        S.credit_card,
        S.points,
        S.date,
        S.total,
        S.employed,
        S.is_trainer,
        S.image_client,
        S.reference,
		S.client_name,
		S.client_id,
	S.hour,
        S.shift_ref,
		S.status,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', P.id,
                'product_name', P.product_name,
                'product_price', P.product_price,
                'image_product', P.image_product,
		'product_coast', P.product_coast,
                'reference', P.reference,
		'quantity', P.quantity,
		'state', P.state,
		'id_product', P.id_product		
            )
        ) AS productsOrder

    FROM 
        sales AS S
    INNER JOIN
        order_sales AS P
    ON
        P.reference = S.reference where S.client_id = $1
       GROUP BY
        S.id
	ORDER BY S.id desc
    `;
    return db.manyOrNone(sql, shift_ref);
}


Order.ShiftOrders = (shift_ref ) => {
    const sql = `
 SELECT 
        S.id,
		S.client_id,
		S.client_name,
        S.name_store,
        S.cash,
        S.credit_card,
        S.points,
        S.date,
        S.total,
        S.employed,
        S.is_trainer,
        S.image_client,
        S.reference,
		S.client_name,
		S.client_id,
	S.hour,
        S.shift_ref,
		S.status,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', P.id,
                'product_name', P.product_name,
                'product_price', P.product_price,
                'image_product', P.image_product,
		'product_coast', P.product_coast,
                'reference', P.reference,
		'quantity', P.quantity,
		'state', P.state,
		'id_product', P.id_product		
            )
        ) AS productsOrder

    FROM 
        sales AS S
    INNER JOIN
        order_sales AS P
    ON
        P.reference = S.reference where S.shift_ref = $1
       GROUP BY
        S.id
	ORDER BY S.id desc
    `;
    return db.manyOrNone(sql, shift_ref);
}

Order.closeShift = (sales) => {
    const sql = `
    INSERT INTO
    
caja(
    date_start,
    date_end,
    income,
    expenses,
    change,
    id_user,
    total,
    state,
    id_close_shift,
    total_card,
    total_cash,
    id_company
        )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11,$12) RETURNING id
    `;

    return db.oneOrNone(sql, [
        new Date(),
        new Date(),
    sales.income,
    sales.expenses,
    sales.change,
    sales.id_user,
    sales.total,
    sales.state,
    sales.id_close_shift,
    sales.total_card,
    sales.total_cash,
    sales.id_company	    
    ]);
}


Order.insertDateIncome = (sales) => {
    const sql = `
    INSERT INTO
    
cash_income(
    date,
    amount,
    description,
    id_close_shift,
    id_company,
    user_id
        )
    VALUES($1, $2, $3, $4, $5, $6) RETURNING id
    `;

    return db.oneOrNone(sql, [
    new Date(),
    sales.amount,
    sales.description,
    sales.id_close_shift,
    sales.id_company,
    sales.user_id,	    
    ]);
}
Order.insertDateExpenses = (sales) => {
    const sql = `
    INSERT INTO
    
cash_expenses(
    date,
    amount,
    description,
    id_close_shift,
    id_company,
    user_id
        )
    VALUES($1, $2, $3, $4, $5, $6) RETURNING id
    `;

    return db.oneOrNone(sql, [
    new Date(),
    sales.amount,
    sales.description,
    sales.id_close_shift,
    sales.id_company,
    sales.user_id,	    
    ]);
}

Order.selectOpenShift = (id_company) => {
    const sql = `
SELECT 
        C.id,
        C.date_start,
        C.date_end,
        C.income,
        C.expenses,
        C.change,
        C.id_user,
        C.total,
        C.state,
        C.id_close_shift,
        C.total_cash,	
	     C.total_card,
		 C.id_company,
		 SUM(P.amount) as amount_income,

        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', P.id,
                'amount', P.amount,
                'description', P.description,
                'id_close_shift', P.id_close_shift,
		         'user_id', P.user_id,
                'date', P.date            
			)
         )AS cashIncome
    FROM 
        caja AS C


    inner JOIN
        cash_income AS P
    ON
        C.id_close_shift = P.id_close_shift 
		
		
	   where C.state = 'ABIERTA' and C.id_company = $1	
       GROUP BY
        C.id



    `;
    return db.manyOrNone(sql,id_company);
}
Order.selectOpenShiftExpenses = (id_company) => {
    const sql = `
SELECT 
			C.id,
			C.date_start,
			C.date_end,
			C.income,
			C.expenses,
			C.change,
			C.id_user,
			C.total,
			C.state,
			C.id_close_shift,
			C.total_cash,	
	        C.total_card,
		    C.id_company,
		    SUM(Q.amount) as amount_expenses,

        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', Q.id,
                'amount', Q.amount,
                'description', Q.description,
                'id_close_shift', Q.id_close_shift,
		        'user_id', Q.user_id,
                'date', Q.date            
			)
         )AS cashExpenses

    FROM 
        caja AS C
		
		
    INNER JOIN
	        cash_expenses AS Q
    ON
       C.id_close_shift = Q.id_close_shift

		
	   where C.state = 'ABIERTA' and C.id_company = $1		
       GROUP BY
        C.id



    `;
    return db.manyOrNone(sql,id_company);
}


Order.selectTotals = (shift_ref) => {
    const sql = `
select 
		    SUM(cash :: bigint) as cash_totals  ,
		    SUM(credit_card :: bigint) as credit_card_totals,
		    SUM(points :: bigint) as points_totals,
		    SUM(total :: bigint)  as totals_sales



from sales as totals where shift_ref = $1 and status = 'SUCCES'
    `;
    return db.manyOrNone(sql,[
        shift_ref
    ]);
}

Order.selectExpenses = (shift_ref) => {
    const sql = `
    
		select * from cash_expenses
		where id_close_shift = $1 and description != 'ENTRADA DE TURNO'
  
    `;
    return db.manyOrNone(sql,[
        shift_ref
    ]);
}

Order.selectIncomes = (shift_ref) => {
    const sql = `
    
		select * from cash_income
		where id_close_shift = $1 and description != 'ENTRADA DE TURNO'
  
    `;
    return db.manyOrNone(sql,[
        shift_ref
    ]);
}

Order.closeShiftClose = (id_Close_Shift, income, expenses, change, total, total_card, total_cash, final_cash ) => {
    const sql = `
    UPDATE
        caja
    	
    SET
        state = 'CERRADA',
	date_end = $2,
	income = $3,
        expenses = $4,
	change = $5,
 	total = $6,
  	total_card = $7,
   	total_cash = $8,
        final_cash = $9
    WHERE
        id_Close_Shift = $1
    `;

    return db.none(sql, [
        id_Close_Shift,
	new Date(),
	income,
	expenses,
	change,
	total,
	total_card,
	total_cash,
	final_cash
    ]);
}

Order.deleteExpenses = (id) => {
    const sql = `

    DELETE 
    
    FROM cash_expenses 

    WHERE id = $1
    `;

    return db.none(sql, [
        id
        
    ]);
}
Order.deleteIncomes = (id) => {
    const sql = `

    DELETE 
    
    FROM cash_income

    WHERE id = $1
    `;

    return db.none(sql, [
        id
        
    ]);
}

Order.selectShiftClose = () => {
    const sql = `
select caja.id,
	   caja.date_start,
	   caja.date_end,
	   caja.income,
	   caja.expenses,
	   caja.change,
	   users.name as nameUser,
	   caja.total,
	   caja.state,
	   caja.id_close_shift,
	   caja.total_card,
	   caja.total_cash,
	   company.name,
	   sum(order_sales.product_price * order_sales.quantity)- sum(order_sales.product_coast * order_sales.quantity) as ganancia,
           caja.final_cash

		from caja
		inner join users on caja.id_user = users.id
		inner join company on caja.id_company = company.id
		inner join order_sales on order_sales.shift_ref = caja.id_close_shift
		where caja.state = 'CERRADA'
		group by caja.id ,users.name,company.name
  		order by caja.date_end desc
		
    `;

    return db.manyOrNone(sql);
}

Order.findByClientDealer = (id_client, shift_ref) => {

    const sql = `
	select 
		D.id,
		D.timestamp,
		D.reference,
		D.method_pay,
		D.machine,
  		D.state,
		D.quantity,
		D.total,
  	        D.shift_ref,
		       COALESCE( JSON_AGG(
	            DISTINCT jsonb_build_object(
					
	                'id', P.id,
	                'name', P.name,
	                'image1', P.image1,
	                'price', P.price,
					'price_buy', P.price_buy,
					'price_sucursal', P.price_sucursal,
					'created_at', P.created_at,
	                'state', P.state
	            )
	        ) FILTER (where P.name != ''), '[]') AS products,
			  JSON_BUILD_OBJECT(
	            'id', U.id,
	            'name', U.name,
	            'phone', U.phone
	        ) AS client,
		     JSON_BUILD_OBJECT(
	            'id', S.id,
	            'name', S.name,
	            'addres', S.addres,
	            'telephone', S.telephone,
	            'logo', S.logo,
	            'available', S.available
	       ) AS sucursal
			
	from dealer_shop as D
	
		    INNER JOIN
				users_dealer AS U
			ON
	        D.user_id = U.id
			
			left join 	dealer_products as P 
			on P.id = D.product_id
	
			left join 	dealer_sucursal as S 
			on S.id = D.sucursal_id
			
	where p.idsucursal = $1 and D.shift_ref = $2		
	group by D.id, U.id, S.id
	order by D.id desc
    `;

    return db.manyOrNone(sql, [id_client, shift_ref]);
}

Order.findByClientDealerRecharge = (id_client) => {

    const sql = `
	select 
	R.id,
	R.id_client,
	R.entity,
	R.created_at,
	R.reference,
	R.amount,
	R.logo,
		  JSON_BUILD_OBJECT(
            'id', U.id,
            'name', U.name,
            'phone', U.phone
        ) AS client

		
from dealer_recharge as R

	    INNER JOIN
			users_dealer AS U
		ON
        R.id_client = U.id
		
		
where U.id = $1 		
group by R.id, U.id
order by R.id desc
    `;

    return db.manyOrNone(sql, [id_client]);
}

Order.findByClientDealerRechargeGym = (id_sucursal, shift_ref ) => {

    const sql = `
	select 
	R.id,
	R.id_client,
	R.entity,
	R.created_at,
	R.reference,
	R.amount,
	R.shift_ref,
 	R.state,
	JSON_BUILD_OBJECT(
            'id', U.id,
            'name', U.name,
            'phone', U.phone,
	    'balance', U.balance
        ) AS client

		
from dealer_recharge_gym as R

	    INNER JOIN
			users_dealer AS U
		ON
        R.id_client = U.id
		
		
where R.id_sucursal = $1 and shift_ref = $2		
group by R.id, U.id
order by R.id desc
    `;

    return db.manyOrNone(sql, [id_sucursal, shift_ref]);
}

Order.insertRecharge = (id_client, balance) => {
    const sql = `
    UPDATE
        users_dealer
    SET
        balance = $2
    WHERE
        id = $1
    `;
    return db.none(sql, [
        id_client,
        balance
    ]);
}

Order.createrecharge = (recharge) => {
    const sql = `
    INSERT INTO
    
dealer_recharge(
    id_client,
    entity,
    created_at,
    amount,
    logo,
    reference
        )
    VALUES($1, $2, $3, $4, $5, $6) RETURNING id
    `;

    return db.oneOrNone(sql, [
    recharge.id_client,
    recharge.entity,
    Date.now(),
    recharge.amount,
    recharge.logo,
    recharge.reference
    ]);
}

Order.createOrdeDealer = (order) => {
    const sql = `
    INSERT INTO
    
dealer_shop(
    reference,
    method_pay,
    machine,
    quantity,
    user_id,
    sucursal_id,
    product_id,
    total,
    timestamp,
    state,
    shift_ref
        )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id
    `;

    return db.oneOrNone(sql, [
    order.reference,
    order.method_pay,
    order.machine,
    order.quantity,
    order.user_id,
    order.sucursal_id,
    order.product_id,
    order.total,
    Date.now(),
    order.state,
	order.shift_ref	    
    ]);
}

Order.createrechargegym = (recharge) => {
    const sql = `
    INSERT INTO
    
dealer_recharge_gym(
    id_client,
    id_sucursal,
    entity,
    amount,
    reference,
    created_at,
    shift_ref,
    state
    )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `;

    return db.oneOrNone(sql, [
    recharge.id_client,
    recharge.id_sucursal,
    recharge.entity,
    recharge.amount,
    recharge.reference,
    Date.now(),
    recharge.shift_ref,
    'EXITOSO'	    
    ]);
}

Order.getSumShift = (id_sucursal, shift_ref) =>{
	const sql = `
SELECT 
  COALESCE((SELECT SUM(amount) FROM dealer_recharge_gym WHERE shift_ref = $2 AND id_sucursal = $1 AND state = 'EXITOSO'), 0) + 
  COALESCE((SELECT SUM(total) FROM dealer_shop WHERE sucursal_id = $1 and method_pay = 'EFECTIVO' and shift_ref = $2), 0) AS total_monto,
  COALESCE((SELECT SUM(total) FROM dealer_shop WHERE sucursal_id = $1 and method_pay = 'TARJETA' and shift_ref = $2), 0) AS total_monto_app,
  COALESCE((SELECT COUNT(*)  FROM dealer_recharge_gym WHERE shift_ref = $2 AND id_sucursal = $1 AND state = 'EXITOSO'),0) AS total_filas,
  COALESCE((SELECT COUNT(*) FROM dealer_shop WHERE sucursal_id =$1 and shift_ref = $2), 0) AS total_ventas;


 `;
return db.manyOrNone(sql, [id_sucursal, shift_ref]);

}

Order.getCortes = (id_sucursal, shift_ref) =>{
	const sql = `
SELECT 
  COALESCE((SELECT SUM(amount) FROM dealer_recharge_gym WHERE  id_sucursal = $1 AND state = 'EXITOSO'), 0) + 
  COALESCE((SELECT SUM(total) FROM dealer_shop WHERE sucursal_id = $1 and method_pay = 'EFECTIVO'), 0) AS total_monto,
  COALESCE((SELECT SUM(total) FROM dealer_shop WHERE sucursal_id = $1 and method_pay = 'TARJETA' ), 0) AS total_monto_app,
  COALESCE((SELECT COUNT(*)  FROM dealer_recharge_gym WHERE  id_sucursal = $1 AND state = 'EXITOSO'),0) AS total_filas,
  COALESCE((SELECT COUNT(*) FROM dealer_shop WHERE sucursal_id =$1), 0) AS total_ventas,
  COALESCE((SELECT created_at  FROM dealer_recharge_shift_turn WHERE id_sucursal =$1 ), 0) AS fecha;


 `;
return db.manyOrNone(sql, [id_sucursal, shift_ref]);

}

Order.getShiftTurn = (id_sucursal) =>{
	const sql = `
	select * from 
        dealer_recharge_shift_turn
	where 
	state = 'ACTIVE'
	and id_sucursal = $1
 `;
return db.oneOrNone(sql, id_sucursal);

}

Order.closeShiftGym = (shiftGym) => {
    const sql = `
      UPDATE  dealer_recharge_shift_turn
      set
	total = $2, 
	total_recharges = $3, 
	created_at = $4, 
	state='CERRADA'
	WHERE id_sucursal = $1 
 	and shift_ref = $5
    `;

    return db.none(sql, [
	shiftGym.id_sucursal,    
	shiftGym.total,
	shiftGym.total_recharges,
	Date.now(),
	shiftGym.shift_ref    
    ]);
}

Order.insertNewTurnGym = (shiftGym) => {
    const sql = `
    INSERT INTO dealer_recharge_shift_turn(
	id_sucursal, 
	total, 
	total_recharges, 
	created_at, 
	shift_ref, 
	state
 	)
	VALUES ($1, $2, $3, $4, $5, $6);
    `;

    return db.oneOrNone(sql, [
    shiftGym.id_sucursal,
    shiftGym.total,
    shiftGym.total_recharges,
	Date.now(),
    shiftGym.shift_ref,
    'ACTIVE'	    
    ]);
}

Order.updateToCancelClient = (id) => {
    const sql = `
	UPDATE dealer_recharge_gym
	SET state='CANCELADO'
	WHERE id = $1
    `;

    return db.none(sql, id);
}

Order.updateToCancelClientToClient = (id, balance) => {
    const sql = `
	UPDATE users_dealer
	SET balance= $2
	WHERE id = $1
    `;

    return db.none(sql, [id, balance]);
}

Order.getDealers = (sucursalId) =>{
	const sql = `
SELECT * FROM dealer_dealers
        where sucursal_id = $1
        ORDER BY id desc  
 `;
return db.manyOrNone(sql, sucursalId);

}



Order.getNotifications = (userId) =>{
	const sql = `
SELECT * 
FROM notification
WHERE id_user = $1
ORDER BY id DESC
LIMIT 10
 `;
return db.manyOrNone(sql, userId);

}


Order.createNotification = (notification) => {
    const sql = `
    INSERT INTO
    
notification(
    id_user,
    notification,
    body,
    icon,
    type,
    "create"
        )
    VALUES($1, $2, $3, $4, $5, $6) RETURNING id
    `;

    return db.oneOrNone(sql, [
    notification.id_user,
    notification.notification,
    notification.body,
    notification.icon,
    notification.type,
    new Date(),
    ]);
}

Order.getAppoiments = (userId) =>{
	const sql = `
SELECT
    a.appointment_id,
    a.start_datetime,
    a.status,
	a.payments_status,
    a.price,
    s.service_name,  -- Dato de la tabla services
    c.name AS business_name, -- Dato de la tabla company
    c.logo AS business_logo,  -- Dato de la tabla company
	c.telephone,
	c.lat,
	c.lng
FROM
    appointments AS a
LEFT JOIN
    services AS s ON a.service_id = s.service_id
LEFT JOIN
    company AS c ON a.business_id = c.id -- Asumiendo que la tabla se llama 'company' y la llave es 'id'
WHERE
    a.client_id = $1 -- Filtrando por el ID del cliente
ORDER BY
    a.start_datetime DESC; -- Ordenando las más recientes primero
 `;
return db.manyOrNone(sql, userId);

}

Order.getAppoimentsByCompany = (id) =>{
	const sql = `
   select 
	a.business_id,
	a.appointment_id,
	a.client_id,
	a.service_id,
    a.start_datetime,
	a.end_datetime,
	a.duration_minutes,
	a.client_notes,
	a.provider_notes,
    a.status,
	a.payments_status,
    a.price,
    s.service_name,  -- Dato de la tabla services
    c.name AS business_name, -- Dato de la tabla company
    c.logo AS business_logo,  -- Dato de la tabla company
	c.telephone,
	u.name,
	u.phone
FROM
    appointments AS a
LEFT JOIN
    services AS s ON a.service_id = s.service_id
LEFT JOIN users as u ON u.id = a.client_id	
LEFT JOIN
    company AS c ON a.business_id = c.id -- Asumiendo que la tabla se llama 'company' y la llave es 'id'
WHERE
    a.business_id = $1 -- Filtrando por el ID del cliente
ORDER BY
    a.start_datetime DESC; -- Ordenando las más recientes primero
 `;
return db.manyOrNone(sql, id);

}

Order.updateAppointmentStatus = (id, newStatus) => {
    const sql = `
    UPDATE public.appointments
	SET  status = $2
	WHERE appointment_id = $1
    `;
    return db.none(sql, [
        id,
        newStatus
    ]);
}

Order.updateSaleStatus = (id, status) => {
    const sql = `
    UPDATE
        sales
    SET
        status = $2
    WHERE
        id = $1
    `;
    return db.none(sql, [
        id,
        status
    ]);
}

Order.getSalesByDateRange = (id, startDate, endDate) => {
    // Lee el query del archivo SQL
    const sql = `
SELECT
    s.id,
    s.name_store,
    s.cash,
    s.credit_card,
    s.points,
    s.date,
    s.total,
    s.employed,
    s.is_trainer,
    s.image_client,
    s.reference,
    s.hour,
    s.shift_ref,
    s.status,
    s.client_name,
    s.client_id,
    
    -- COALESCE previene que el valor sea NULL si una venta no tiene productos,
    -- devolviendo un array JSON vacío '[]' en su lugar.
    -- FILTER (WHERE ohp.id IS NOT NULL) evita que se agregue un objeto [null]
    -- si la venta existe pero no tiene productos en la tabla de detalles.
    COALESCE(
        json_agg(
            json_build_object(
                'id', ohp.id,
                'product_name', ohp.product_name,
                'product_price', ohp.product_price,
                'image_product', ohp.image_product,
                'product_coast', ohp.product_coast,
                'reference', ohp.reference,
                'quantity', ohp.quantity,
                'id_product', ohp.id_product -- Asumiendo que este campo existe en 'order_has_products'
            )
        ) FILTER (WHERE ohp.id IS NOT NULL),
        '[]'::json
    ) AS productsorder
    
FROM
    public.sales AS s
    
-- Usamos LEFT JOIN para asegurar que la venta se muestre
-- incluso si, por alguna razón, no tuviera productos asociados.
LEFT JOIN
    public.order_sales AS ohp ON s.reference = ohp.reference
        
WHERE
 s.date BETWEEN $2 AND $3
    
    -- Opcional: Nos aseguramos de traer solo ventas completadas
    AND s.status = 'SUCCES' 
    
GROUP BY
    -- Agrupamos por el ID de la venta para que json_agg funcione correctamente
    s.id
    
ORDER BY
    -- Mostramos las ventas más recientes primero
    s.date DESC, s.hour DESC;

    `;
    return db.manyOrNone(sql, [id, startDate, endDate]);
}


Order.createCotization = (order) => {
    const sql = `
    INSERT INTO
        cotizaciones(
            company_id,
            user_id,
            client_name,
            products,
            total,
            is_completed,
            created_at,
            expires_at,
	        client_id
        )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
    `;

    return db.oneOrNone(sql, [
        order.company_id,
        order.user_id,
        order.client_name,
        order.products,
        order.total,
	    order.is_completed,    
        order.created_at,
	   order.expires_at,    
	   order.client_id
    
    ]);
}

Order.getSavedCotizations  = (id ) => {
    const sql = `
select 
c.id,
c.company_id,
c.user_id,
c.client_name,
t.email as client_email,
t.phone as client_phone,
c.products,
c.total,
c.is_completed,
c.created_at,
c.expires_at,
c.client_id


from cotizaciones as c

inner join users as u on c.user_id = u.id
left join users_mayoreo as t on c.client_id = t.id

 where company_id = $1 order by id desc
 `;
    return db.manyOrNone(sql, id);
}


/* =================================================================
// ===== FUNCION DEL MODELO (CORREGIDA CON LOGS Y 'state') ========
// =================================================================
*/
Order.confirm = (id) => {
    // db.tx es la forma de pg-promise de manejar transacciones
    return db.tx(async t => {
        
        console.log(`\n======================================================`);
        console.log(`[Order.confirm] Iniciando transacción para Cotización ID: ${id}`);
        
        // 1. Obtener la cotización y bloquear la fila
        const quote = await t.oneOrNone(
            'SELECT * FROM cotizaciones WHERE id = $1 FOR UPDATE', 
            [id]
        );

        // --- Validaciones iniciales ---
        if (!quote) {
            console.error('[Order.confirm] Error: Cotización no encontrada');
            return { success: false, message: 'Cotización no encontrada', statusCode: 404 };
        }
        if (quote.is_completed) {
            console.warn('[Order.confirm] Info: Esta cotización ya fue confirmada');
            return { success: false, message: 'Esta cotización ya fue confirmada', statusCode: 400 };
        }
        if (new Date(quote.expires_at) < new Date()) {
            console.warn('[Order.confirm] Error: Cotización expirada');
            return { success: false, message: 'Esta cotización ha expirado', statusCode: 410 };
        }

        const productsInQuote = quote.products; // Es un array JSON
        const availableProducts = [];
        const unavailableProducts = [];
        let newTotal = 0.0;
        let stockWasSufficient = true; 

        console.log(`[Order.confirm] Verificando stock para ${productsInQuote.length} productos...`);

        // 2. VERIFICAR STOCK (Producto por producto)
        for (const product of productsInQuote) {
            
            console.log(`--- Verificando Producto ID: ${product.id} (Nombre: ${product.name}) ---`);

            // Obtenemos el stock actual (usando 'state') Y el precio
            const dbProduct = await t.oneOrNone(
                'SELECT state, price_wholesale FROM products WHERE id = $1', 
                [product.id]
            );
            
            let currentStock = 0; // Por defecto 0
            
            // **CORRECCIÓN DE BUG CRÍTICO:**
            // Comprobar si el producto existe y si 'state' no es nulo
            if (dbProduct && dbProduct.state !== null && dbProduct.state !== undefined) {
                currentStock = parseInt(dbProduct.state, 10);
            } else {
                console.error(`[Order.confirm] ¡PRODUCTO NO ENCONTRADO O SIN STATE! ID: ${product.id}`);
            }

            const quantityNeeded = parseInt(product.quantity, 10); // Asegurarnos que la cantidad es int

            console.log(`[Order.confirm] Stock en BD (state): ${currentStock} | Cantidad Requerida: ${quantityNeeded}`);
            
            if (currentStock >= quantityNeeded) {
                // SÍ hay stock
                console.log(`[Order.confirm] Stock: SUFICIENTE`);
                product.price_wholesale = parseFloat(dbProduct.price_wholesale); 
                availableProducts.push(product);
                newTotal += (product.price_wholesale * quantityNeeded);
            } else {
                // NO hay stock
                console.log(`[Order.confirm] Stock: INSUFICIENTE`);
                stockWasSufficient = false;
                unavailableProducts.push(product.name);
            }
        }

        // 3. DECIDIR EL CAMINO
        
        // ---- Escenario A: TODO el stock estuvo disponible ----
        if (stockWasSufficient) {
            
            console.log(`[Order.confirm] Escenario A: Stock SUFICIENTE para todo. Descontando...`);
            
            // 4. DESCONTAR STOCK
            const updates = availableProducts.map(product => {
                console.log(`[Order.confirm] Descontando ${product.quantity} de Producto ID: ${product.id}`);
                return t.none(
                    'UPDATE products SET state = (state::int - $1)::text WHERE id = $2',
                    [product.quantity, product.id]
                );
            });
            await t.batch(updates); // Ejecutar todos los updates de stock

            // 5. MARCAR COTIZACIÓN COMO COMPLETADA
            await t.none(
                'UPDATE cotizaciones SET is_completed = true WHERE id = $1',
                [id]
            );
            
            console.log(`[Order.confirm] ¡ÉXITO! Cotización ID ${id} confirmada.`);
            console.log(`======================================================\n`);
            
            return {
                success: true,
                statusCode: 200,
                message: '¡Cotización confirmada! Stock descontado.',
                data: { status: 'CONFIRMED' }
            };
        }
        
        // ---- Escenario B: Faltó stock (Tu nueva lógica) ----
        else {
            
            console.log(`[Order.confirm] Escenario B: Stock INSUFICIENTE para: ${unavailableProducts.join(', ')}`);
            
            // 4. ACTUALIZAR LA COTIZACIÓN con los productos que SÍ están
            const newProductsJson = JSON.stringify(availableProducts);

            const updatedQuote = await t.one(
                `UPDATE cotizaciones 
                 SET products = $1, total = $2 
                 WHERE id = $3
                 RETURNING *`, 
                [newProductsJson, newTotal, id]
            );

            console.log(`[Order.confirm] Cotización ID ${id} actualizada con productos disponibles.`);
            console.log(`======================================================\n`);
            
            return {
                success: false,
                message: `Stock insuficiente para: ${unavailableProducts.join(', ')}. La cotización se actualizó.`,
                statusCode: 409, // Conflict
                data: {
                    status: 'UPDATED',
                    unavailable: unavailableProducts,
                    updatedQuote: updatedQuote 
                }
            };
        }
        
    }); // Fin de la transacción db.tx
}


/* =================================================================
// ===== NUEVA FUNCION DEL MODELO (CANCELAR Y DEVOLVER STOCK) ======
// =================================================================
*/
Order.cancel = (id) => {
    // Usamos una transacción. Si algo falla, se revierte todo.
    return db.tx(async t => {

        console.log(`\n======================================================`);
        console.log(`[Order.cancel] Iniciando transacción para Cotización ID: ${id}`);

        // 1. Obtener la cotización y bloquear la fila
        const quote = await t.oneOrNone(
            'SELECT * FROM cotizaciones WHERE id = $1 FOR UPDATE', 
            [id]
        );

        // --- Validaciones ---
        if (!quote) {
            console.error('[Order.cancel] Error: Cotización no encontrada');
            return { success: false, message: 'Cotización no encontrada', statusCode: 404 };
        }
        if (!quote.is_completed) {
            console.warn('[Order.cancel] Info: Esta cotización ya está "Pendiente", no se puede cancelar.');
            return { success: false, message: 'Esta cotización no está confirmada, no se puede cancelar.', statusCode: 400 };
        }

        const productsToReturn = quote.products; // Array JSON de productos
        
        console.log(`[Order.cancel] Devolviendo stock para ${productsToReturn.length} productos...`);

        // 2. CREAR LOTE DE DEVOLUCIÓN DE STOCK
        const updates = productsToReturn.map(product => {
            console.log(`[Order.cancel] Devolviendo ${product.quantity} a Producto ID: ${product.id}`);
            return t.none(
                // USAMOS EL SIGNO '+' PARA DEVOLVER EL STOCK
                'UPDATE products SET state = (state::int + $1)::text WHERE id = $2',
                [product.quantity, product.id]
            );
        });
        
        // 3. EJECUTAR LOTE DE DEVOLUCIÓN
        await t.batch(updates);

        // 4. MARCAR COTIZACIÓN COMO NO COMPLETADA (PENDIENTE)
        await t.none(
            'UPDATE cotizaciones SET is_completed = false WHERE id = $1',
            [id]
        );

        console.log(`[Order.cancel] ¡ÉXITO! Cotización ID ${id} cancelada. Stock devuelto.`);
        console.log(`======================================================\n`);

        return {
            success: true,
            statusCode: 200,
            message: '¡Cotización cancelada! El stock ha sido devuelto al inventario.',
            data: { status: 'CANCELLED' }
        };

    }); // Fin de la transacción db.tx
}

module.exports = Order;
