const db = require('../config/config');
const Product = {};


Product.getAll = () =>{
	const sql = `
		 select * from products
		 order by id_category
 
 
 `;
return db.manyOrNone(sql);

}
Product.findLast5 = () =>{
	const sql = `
	 SELECT * FROM plates
	ORDER BY id desc
	LIMIT 5
 `;
return db.manyOrNone(sql);

}

Product.findReview = (id) =>{
	const sql = `
select 
		R.id,
		U.name as username,
		R.review,
		R.calification,
  		R.id_user,
        COALESCE(json_agg(
		JSON_BUILD_OBJECT(
                'id', C.id,
				'username',C.username,
                'useremail', C.useremail,
				'id_user',C.id_user
		)
		) FILTER (WHERE C.useremail != '0'), '[]') as likes 
		from reviews  as R
		
		inner join plates as P on P.id = R.id_plate
	    inner join commentsLikes as C on R.id = C.id_plate
		inner join users as U on U.id  = R.id_user  
		
		where P.id = $1
		group by R.id, U.name, R.review, R.calification
		order by id desc



 `;
return db.manyOrNone(sql, id);

}

Product.findLikes = (id_plate) =>{
	const sql = `
      select 
		reviews.id,
		JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', C.id,
                'username', U.name,
                'id_user', C.id_user
            )
        ) as likes
		from reviews
		
	
		inner join commentsLikes as C on reviews.id = C.id_plate
		inner join users as U on U.id = C.id_user
		
		where reviews.id_plate = $1
		
		group by reviews.id
 `;
return db.manyOrNone(sql, id_plate);

}

Product.findFavorites = (id_plate, id_user) => {

    const sql = `
    SELECT 

    *
        
    FROM
        favorites
    WHERE
        id_plate = $1 and id_user = $2`  ;

    return db.oneOrNone(sql, [
        id_plate,
        id_user
    ]);
}

Product.getAnswers = (id) => {

    const sql = `
select    A.id,
		  A.username,
		  A.answer,
          A.responseto,
	  A.userId_answer,
       COALESCE(json_agg(
		JSON_BUILD_OBJECT(
                'id', C.id,
				'username',C.username,
                'useremail', C.useremail,
				'id_user',C.id_user
		)
		) FILTER (WHERE C.useremail != '0'), '[]') as likesanswer		  
		  from answers as A
inner join reviews as R on R.id = A.id_review  
inner join answersLikes as C on A.id = C.id_answer
where R.id = $1
group by A.id
order by A.id asc
	`;

    return db.manyOrNone(sql, id);
}

Product.findSaves = (id_plate, id_user) => {

    const sql = `
    SELECT 

    *
        
    FROM
        saves
    WHERE
        id_plate = $1 and id_user = $2`  ;

    return db.oneOrNone(sql, [
        id_plate,
        id_user
    ]);
}

Product.getReviewPlateFavoriteIcon = (id_plate) =>{
	const sql = `
		SELECT 
  count(favorites) as rate
FROM 
  favorites where id_plate = $1
 `;
return db.manyOrNone(sql, id_plate);

}

Product.getReviewPlateRate = (id_plate) =>{
	const sql = `
		SELECT 
  SUM(calification) as rate,
  count(calification) as calification
FROM 
  reviews where id_plate  = $1
 `;
return db.manyOrNone(sql, id_plate);

}
Product.getSaves = (id_user) =>{
	const sql = `
		select 
		plates.id,
		plates.name,
  		plates.description,
		plates.price,
		plates.image1,
		plates.image2,
		plates.image3,
		plates.id_category,
		plates.stock,
		plates.price_special,
		plates.price_buy,
		plates.state,
		plates.price_wholesale,
		plates.carbs,
		plates.protein,
		plates.calorias
		from plates
		inner join saves as S on plates.id = S.id_plate
		where id_user = $1
 `;
return db.manyOrNone(sql, id_user);

}

Product.getFavorites = (id_user) =>{
	const sql = `
		select 
		plates.id,
		plates.name,
  		plates.description,
		plates.price,
		plates.image1,
		plates.image2,
		plates.image3,
		plates.id_category,
		plates.stock,
		plates.price_special,
		plates.price_buy,
		plates.state,
		plates.price_wholesale,
		plates.carbs,
		plates.protein,
		plates.calorias
		from plates
		inner join favorites as F on plates.id = F.id_plate
		where id_user = $1
 `;
return db.manyOrNone(sql, id_user);

}

Product.getAllStocks = (id_company) =>{
	const sql = `
select products.id,
	   categories.name as nameCat,
	   products.name,
	   stock.stock
from products

inner join categories on categories.id = products.id_category
inner join stock on stock.id_product = products.id
where stock.id_company = $1
order by id_category
 
 
 `;
return db.manyOrNone(sql, id_company);

}


Product.createReview = (comments) => {
    const sql = `
with rows as (
    INSERT INTO reviews(
		id_plate, 
		id_user,
		review, 
		calification)
    VALUES($1,$2,$3,$4 )
	RETURNING id, id_user)
INSERT INTO commentslikes(
	id_plate, 
	id_user,
 	useremail
 )
SELECT id, id_user, $5
FROM rows
    `;
    return db.oneOrNone(sql, [
        comments.id_plate,
        comments.id_user,
        comments.review,
	comments.calification,
	'0'    

	    
        
    ]);
}

Product.createLike = (id_plate, username ,useremail, id_user) => {
    const sql = `
    INSERT INTO commentslikes(
	id_plate, 
 	username,
  	useremail,
        id_user
	)
    VALUES($1, $2, $3, $4  ) RETURNING id
    
    `;
    return db.manyOrNone(sql, [id_plate, username, useremail, id_user]);
}

Product.createLikeAnswer = (id_answer, username ,useremail, id_user) => {
    const sql = `
    INSERT INTO answerslikes(
	id_answer, 
 	username,
  	useremail,
        id_user
	)
    VALUES($1, $2, $3, $4  ) RETURNING id
    
    `;
    return db.manyOrNone(sql, [id_answer, username, useremail, id_user]);
}



Product.createAnswer = (id_review, username , answer, responseto, id_user) => {
    const sql = `
		with rows as (
		    INSERT INTO answers(
				id_review, 
				username,
				answer,
				responseto,
    				"userId_answer"
			)
		    VALUES($1,$2,$3,$4, $5 )
			RETURNING id, username )
		INSERT INTO answerslikes(
			id_answer, 
			username,
			useremail,
			id_user
		 )
		SELECT id, username, '0', $5
		FROM rows

    `;
    return db.manyOrNone(sql, [id_review, username, answer, responseto,id_user ]);
}

Product.create = (product) => {
    const sql = `
    INSERT INTO 
        products(
            name,
            description,
            price,
            image1,
            image2,
            image3,
            id_category,
            created_at,
            updated_at,
            stock
            
        )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, 'true') RETURNING id
    `;
    return db.oneOrNone(sql, [
        product.name,
        product.description,
        product.price,
        product.image1,
        product.image2,
        product.image3,
        product.id_category,
        new Date(),
        new Date()
        
    ]);
}

Product.createPLate = (plate) => {
    const sql = `
    INSERT INTO 
        plates(
	   name,
	   description,
	   price,
	   image1,
	   image2,
	   image3,
	   id_category,
	   stock,
	   price_special,
	   price_buy,
	   state,
	   price_wholesale,
	   carbs,
	   protein,
	   calorias
            
        )
    VALUES($1, $2, $3, $4, $5, $6, $7, 'true', $8, $9,'true',$10, $11, $12, $13) RETURNING id
    `;
    return db.oneOrNone(sql, [
	   plate.name,
	   plate.description,
	   plate.price,
	   plate.image1,
	   plate.image2,
	   plate.image3,
	   plate.id_category,
	   plate.price_special,
	   plate.price_buy,
	   plate.price_wholesale,
	   plate.carbs,
	   plate.protein,
	   plate.calorias
        
    ]);
}

Product.setStock = (stock) => {
    const sql = `
    INSERT INTO 
        stock(
            id_company,
            stock,
            id_product
        )
    VALUES($1, $2, $3) RETURNING id
    `;
    return db.oneOrNone(sql, [
        stock.id_company,
        stock.stock,
        stock.id_product
        
    ]);
}

Product.updateStockers = (id_product, stock, id_company) => {
    const sql = `
    UPDATE
        stock
    SET
        stock = $2
	WHERE
        id_product = $1 and id_company = $3
    `;
    return db.none(sql, [id_product, stock, id_company]);
}


Product.setFavorites = (id_plate, id_user) => {
    const sql = `
    INSERT INTO
        favorites(
	    id_plate,  
            id_user
        )
    VALUES($1, $2)    
    `;
    return db.none(sql, [
        id_plate,
        id_user
    ]);
}

Product.setSave = (id_plate, id_user) => {
    const sql = `
    INSERT INTO
        saves(
	    id_plate,  
            id_user
        )
    VALUES($1, $2)    
    `;
    return db.none(sql, [
        id_plate,
        id_user
    ]);
}

Product.deleteFavorites = (id_plate, id_user) => {
    const sql = `

    DELETE  
    FROM favorites 

    WHERE id_plate = $1 and id_user = $2
    `;
    return db.none(sql, [
        id_plate,
        id_user
    ]);
}

Product.deleteteSave = (id_plate, id_user) => {
    const sql = `

    DELETE  
    FROM saves 

    WHERE id_plate = $1 and id_user = $2
    `;
    return db.none(sql, [
        id_plate,
        id_user
    ]);
}


Product.createTab = (product) => {
    const sql = `
    INSERT INTO 
        products(
            name,
            description,
            price,
            image1,
            image2,
            image3,
            id_category,
            created_at,
            updated_at,
            stock,
	    id_company, 
     	    price_special,
	    price_buy,
     	    state,
	    price_wholesale
	    
            
        )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, 'true',$10 ,$11 ,$12 ,$13, $14) RETURNING id
    `;
    return db.oneOrNone(sql, [
        product.name,
        product.description,
        product.price,
        product.image1,
        product.image2,
        product.image3,
        product.id_category,
        new Date(),
        new Date(),
        product.id_company,
	product.price_special,
	product.price_buy,
	product.state,
	product.price_wholesale    
        
    ]);
}

Product.findByCategory = (id_category) => {
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
	products as P
INNER JOIN 
	categories as C
ON
	p.id_category = C.id
WHERE
	C.id = $1
    
    `;
    return db.manyOrNone(sql, id_category);
}


Product.getByCtaegoryPlate = (id_category) => {
    const sql = `
SELECT 
	P.id,
	P.name,
	P.description,
	P.price,
	P.image1,
	P.image2,
	P.image3,
	P.stock,
	P.price_special,
	P.price_buy,
	P.state,
	P.price_wholesale,
        P.carbs,
	P.protein,
 	P.calorias
FROM
	plates as P
INNER JOIN 
	categoriesplates as C
ON
	p.id_category = C.id
WHERE
	C.id = $1
    
    `;
    return db.manyOrNone(sql, id_category);
}

Product.findByCategoryStocks = (id_category, id_company) => {
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
	S.stock as state,
	P.price_special,
	P.price_buy,
 	P.price_wholesale
FROM
	products as P
INNER JOIN 
	categories as C
ON
	p.id_category = C.id
inner join stock as S
on P.id = S.id_product
	
WHERE
	C.id = $1 and S.id_company = $2
    
    `;
    return db.manyOrNone(sql, [id_category, id_company]);
}

Product.findByCategoryAndProductName = (id_category, product_name) => {
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
        C.id = $1 AND p.name ILIKE $2
    `;

    return db.manyOrNone(sql, [id_category, `%${product_name}%`]);
}

Product.getByCtaegoryAndProductNamePlate = (id_category, product_name) => {
    const sql = `
    SELECT
        P.id,
	P.name,
	P.description,
	P.price,
	P.image1,
	P.image2,
	P.image3,
	P.stock,
	P.price_special,
	P.price_buy,
	P.state,
	P.price_wholesale,
        P.carbs,
	P.protein,
 	P.calorias
    FROM
        plates AS P
    INNER JOIN
        categoriesplates AS C
    ON
        P.id_category = C.id
    WHERE
        C.id = $1 AND p.name ILIKE $2
    `;

    return db.manyOrNone(sql, [id_category, `%${product_name}%`]);
}


Product.findByCategoryAndProductNameStocks = (id_category, product_name, id_company) => {
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
	S.stock as state,
	P.price_special,
	P.price_buy,
 	P.price_wholesale
    FROM
        products AS P
    INNER JOIN
        categories AS C
    ON
        P.id_category = C.id
	inner join stock as S
    on P.id = S.id_product	
    WHERE
        C.id = $1 AND p.name ILIKE $2 and S.id_company = $3
    `;

    return db.manyOrNone(sql, [id_category, `%${product_name}%` , id_company]);
}

Product.updatePlate = (plate) => {
    const sql = `
    
    UPDATE
        plates
    SET
	    image1 = $2,
     	    image2 = $3,
	    image3 = $4

    where

        id = $1
        `;
    return db.none(sql, [
           plate.id,	
	   plate.image1,
	   plate.image2,
	   plate.image3

    ]);

}

Product.update = (product) => {
    const sql = `
    
    UPDATE
        products
    SET
            name = $2,
            description = $3,
            price = $4,
	    image1 = $5,
     	    image2 = $6,
	    image3 = $7,
            id_category = $8,
            updated_at = $9,
            stock = $10,
	    id_company = $11, 
     	    price_special = $12,
	    price_buy = $13,
     	    state = $14,
	    price_wholesale = $15

    where

        id = $1
        `;
    return db.none(sql, [
        product.id,
        product.name,
        product.description,
        product.price,
        product.image1,
        product.image2,
        product.image3,
        product.id_category,
        new Date(),
	product.stock,
	product.id_company,
        product.price_special,
        product.price_buy,
	product.state,
	product.price_wholesale    

    ]);

}

Product.updateAdmin = (product) => {
    const sql = `
    
    UPDATE
        products
    SET
            name = $2,
            description = $3,
            price = $4,
            id_category = $5,
	    id_company = $6, 
     	    price_special = $7,
	    price_buy = $8,
     	    state = $9,
	    price_wholesale = $10

    where

        id = $1
        `;
    return db.none(sql, [
        product.id,
        product.name,
        product.description,
        product.price,
        product.id_category,
	product.id_company,
        product.price_special,
        product.price_buy,
	product.state,
	product.price_wholesale    

    ]);

}

Product.delete = (id) => {
    const sql = `

    DELETE 
    
    FROM products 

    WHERE id = $1
    `;

    return db.none(sql, [
        id
        
    ]);
}

Product.deleteSale = (id) => {
    const sql = `

    DELETE 
    
    FROM sales 

    WHERE id = $1
    `;

    return db.none(sql, [
        id
        
    ]);
}

Product.updateStock = (product) => {
    const sql = `
    UPDATE
        products
    SET
        stock = $2
    WHERE
        id = $1
    `;

    return db.none(sql, [
        product.id,
        product.stock
    ]);
}

Product.findMyProduct = (name) => {
    const sql = `
    select * from 
    products 
    where name = $1

    `;
    return db.manyOrNone(sql, name);
}

Product.getAllCompany = () =>{
	const sql = `
		 select * from company
		 order by id
 
 
 `;
return db.manyOrNone(sql);

}

Product.getGift = () =>{
	const sql = `
        select * from 
	gift 
        where active = 'true'
 `;
return db.manyOrNone(sql);

}


Product.getGifts = () =>{
	const sql = `
        select * from 
	gift order by active = 'true' desc
 `;
return db.manyOrNone(sql);

}


Product.turnOff = () => {
    const sql = `
    UPDATE
        gift
    SET
        active = 'false'
    `;

    return db.none(sql);
}


Product.turnOn = (id) => {
    const sql = `
    UPDATE
        gift
    SET
        active = 'true'
	where gift_id = $1
    `;

    return db.none(sql, id);
}

Product.createGift = (gift) => {
    const sql = `
    INSERT INTO 
        gift(
            code,
            active,
            amount
            
        )
    VALUES($1, $2, $3)
    `;
    return db.oneOrNone(sql, [
        gift.code,
        gift.active,
        gift.amount

    ]);
}




module.exports = Product;
