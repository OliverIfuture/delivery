const db = require('../config/config');

const Order = {};


Order.findByStatus = (status) => {

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
        status = $1
    GROUP BY
        O.id, U.id, A.id, U2.id
    ORDER BY O.id desc
    `;

    return db.manyOrNone(sql, status);

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
            drone_id



        )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,$13) RETURNING id
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
	order.drone_id
    
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
    shift_ref
        )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11,$12) RETURNING id
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
    sales.shift_ref

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


Order.ShiftOrders = (shift_ref ) => {
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
        P.reference = S.reference where S.shift_ref = $1
       GROUP BY
        S.id
	ORDER BY S.id ASC
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



from sales as totals where shift_ref = $1
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

Order.findByClientDealer = (id_client) => {

    const sql = `
	select 
		D.id,
		D.timestamp,
		D.reference,
		D.method_pay,
		D.machine,
		D.quantity,
		D.total,
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
			
	where U.id = $1		
	group by D.id, U.id, S.id
	order by D.id desc
    `;

    return db.manyOrNone(sql, [id_client]);
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
    state
        )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
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
    order.state	    
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
	  SUM(amount) AS total_monto,
	  COUNT(*) AS total_filas
	FROM 
	  dealer_recharge_gym 
	WHERE 
	  shift_ref = $2 
	  AND id_sucursal = $1
	  and state = 'EXITOSO'
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


module.exports = Order;
