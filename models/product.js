const db = require('../config/config');
const Product = {};


Product.getAll = () =>{
	const sql = `
		 select * from products		 where id_category != 24
		 order by id_category

   
 
 
 `;
return db.manyOrNone(sql);

}
Product.deletePost = (id) => {

    const sql = `
    DELETE FROM post
    WHERE  id = $1
    `;

    return db.oneOrNone(sql,id);
}
Product.createPost = (id_user, description, url) => {

    const sql = `
with rows as (
  INSERT INTO
        post(
            id_user,
            description,
            image_post,
			id_company
        )
    VALUES($1, $2, $3,$4) RETURNING id)
		INSERT INTO likes_publish(
			id_publish, 
			username,
			useremail,
			id_user
		 )
		SELECT id, '0', '0', '0'
		FROM rows
    `;

    return db.oneOrNone(sql, [
        id_user,
        description,
	url,
		1
    ]);
}
Product.getUserProfile = (id) =>{
	const sql = `
		select 
id,
name, 
image from users  where id = $1
 `;
return db.manyOrNone(sql, id);

}


Product.favoritesplatesProducts = (id) =>{
	const sql = `
		select 
			U.name,
			U.image,
   			U.lastname as city,
   			U.id
		from favoritesproducts as F
		inner join users as U on U.id = F.id_user
		where id_product = $1
 `;
return db.manyOrNone(sql, id);

}

Product.favoritesplates = (id) =>{
	const sql = `
		select 
			U.name,
			U.image,
   			U.id
		from favorites as F
		inner join users as U on U.id = F.id_user
		where id_plate = $1
 `;
return db.manyOrNone(sql, id);

}
Product.lookFavoritesList = (id_profile) =>{
	const sql = `
		select 
			U.name,
			U.image,
   			U.id
		from favorites_profile as F
		inner join users as U on U.id = F.id_user
		where id_profile = $1
 `;
return db.manyOrNone(sql, id_profile);

}

Product.lookFollowersList = (id_profile) =>{
	const sql = `
		select 
			U.name,
			U.image,
   			U.id
		from followers as F
		inner join users as U on U.id = F.id_user
		where id_profile = $1
 `;
return db.manyOrNone(sql, id_profile);

}


Product.getPostAll = () =>{
	const sql = `
select 
p.id,
P.id_user,
P.description,
p.social,
P.image_post,
p.id_company,
U.name,
U.image as photo,
  COALESCE(json_agg(
           DISTINCT jsonb_build_object(
                'id', L.id,
				'id_publish',L.id,
                'useremail', L.useremail,
				'id_user',L.id_user
		)
		) FILTER (WHERE L.useremail != '0'), '[]') as likespost	
		from post as P
inner join users as U on U.id = P.id_user 
inner join likes_publish as L on L.id_publish = P.id
where p.id_company = 1
group by p.id,U.name, U.image
order by id desc
 `;
return db.manyOrNone(sql);
}



Product.getPost = (id_user) =>{
	const sql = `
select 
p.id,
P.id_user,
P.description,
P.image_post,
U.name,
U.image as photo

from post as P
inner join users as U on U.id = P.id_user 

where id_user = $1
order by P.id desc
 `;
return db.manyOrNone(sql, id_user);
}

Product.getGiftsProducts = () =>{
	const sql = `
 	select * from products		 
 	where id_category = 24
		order by id_category

 `;
return db.manyOrNone(sql);

}

Product.populars = () =>{
	const sql = `
	select * from products where id_category = 190

 `;
return db.manyOrNone(sql);

}


Product.servings = () =>{
	const sql = `
select * from plates where id_category = 4
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

Product.findPostComent = (id) =>{
	const sql = `
select 
		R.id,
		U.name as username,
		U.image,
		R.coment,
  		R.id_user,
        COALESCE(json_agg(
           DISTINCT jsonb_build_object(
                'id', C.id,
				'username',C.username,
                'useremail', C.useremail,
				'id_user',C.id_user
		)
		) FILTER (WHERE C.useremail != '0'), '[]') as likes 
		from coments_post  as R
		
		inner join post as P on P.id = R.id_post
	    inner join commentsLikes_post as C on R.id = C.id_post
		inner join users as U on U.id  = R.id_user  
		
		where P.id = $1
		group by R.id, U.name, R.coment, U.image
		order by id desc



 `;
return db.manyOrNone(sql, id);

}


Product.findReviewProduct = (id) =>{
	const sql = `
select 
		R.id,
		U.name as username,
		U.image,
		U.lastname as city,
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
		from reviewsproducts  as R
		
		inner join products as P on P.id = R.id_product
	    inner join commentsproducts as C on R.id = C.id_product
		inner join users as U on U.id  = R.id_user  
		
		where P.id = $1
		group by R.id, U.name, R.review, R.calification, U.image, U.lastname
		order by id desc



 `;
return db.manyOrNone(sql, id);

}

Product.findReview = (id) =>{
	const sql = `
select 
		R.id,
		U.name as username,
		U.image,
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
		group by R.id, U.name, R.review, R.calification, U.image
		order by id desc



 `;
return db.manyOrNone(sql, id);

}

Product.findLikesComent = (id_post) =>{
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
return db.manyOrNone(sql, id_post);

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


Product.findFavoritesProduct = (id_plate, id_user) => {

    const sql = `
    SELECT 

    *
        
    FROM
        favoritesproducts
    WHERE
        id_product = $1 and id_user = $2`  ;

    return db.oneOrNone(sql, [
        id_plate,
        id_user
    ]);
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
Product.findFollowersProfile = (id_profile, id_user) => {

    const sql = `
    SELECT 

    *
        
    FROM
        followers
    WHERE
        id_profile = $1 and id_user = $2`  ;

    return db.oneOrNone(sql, [
        id_profile,
        id_user
    ]);
}
Product.findFavoritesProfile = (id_profile, id_user) => {

    const sql = `
    SELECT 

    *
        
    FROM
        favorites_profile
    WHERE
        id_profile = $1 and id_user = $2`  ;

    return db.oneOrNone(sql, [
        id_profile,
        id_user
    ]);
}

Product.getAnswersPost = (id) => {

    const sql = `
select    A.id,
		  A.username,
		  A.answer,
          A.responseto,
	      A.userid_answer,
		  U.image,
       COALESCE(json_agg(
           DISTINCT jsonb_build_object(
                'id', C.id,
				'username',C.username,
                'useremail', C.useremail,
				'id_user',C.id_user
		)
		) FILTER (WHERE C.useremail != '0'), '[]') as likesanswer		  
		  from answers_post as A
		  inner join users as U on U.id = A.userid_answer
inner join coments_post as R on R.id = A.id_post
inner join answerslikes_post as C on A.id = C.id_answer
where R.id = $1
group by A.id, U.image
order by A.id   asc
	`;

    return db.manyOrNone(sql, id);
}


Product.getAnswersProducts = (id) => {

    const sql = `
select    A.id,
		  A.username,
		  A.answer,
          A.responseto,
	      A.userid_answer,
		  U.image,
       COALESCE(json_agg(
		JSON_BUILD_OBJECT(
                'id', C.id,
				'username',C.username,
                'useremail', C.useremail,
				'id_user',C.id_user
		)
		) FILTER (WHERE C.useremail != '0'), '[]') as likesanswer		  
		  from answersproducts as A
		  inner join users as U on U.id = A.userid_answer
inner join reviewsproducts as R on R.id = A.id_review  
inner join answerslikesproducts as C on A.id = C.id_answer
where R.id = $1
group by A.id, U.image
order by A.id   asc


	`;

    return db.manyOrNone(sql, id);
}

Product.getAnswers = (id) => {

    const sql = `
select    A.id,
		  A.username,
		  A.answer,
          A.responseto,
	      A.userid_answer,
		  U.image,
       COALESCE(json_agg(
		JSON_BUILD_OBJECT(
                'id', C.id,
				'username',C.username,
                'useremail', C.useremail,
				'id_user',C.id_user
		)
		) FILTER (WHERE C.useremail != '0'), '[]') as likesanswer		  
		  from answers as A
		  inner join users as U on U.id = A.userid_answer
inner join reviews as R on R.id = A.id_review  
inner join answersLikes as C on A.id = C.id_answer
where R.id = $1
group by A.id, U.image
order by A.id   asc


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
Product.getProfileFavoriteIconSum = (id_profile) =>{
	const sql = `
		SELECT 
  count(favorites_profile) as rate
FROM 
  favorites_profile where id_profile = $1
 `;
return db.manyOrNone(sql, id_profile);

}

Product.getReviewPlateFavoriteIconProduct = (id_plate) =>{
	const sql = `
		SELECT 
  count(favoritesproducts) as rate
FROM 
  favoritesproducts where id_product = $1
 `;
return db.manyOrNone(sql, id_plate);

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
Product.getProfilePlatesIconSumProfile = (id_profile) =>{
	const sql = `
		SELECT 
  count(favorites) as rate
FROM 
  favorites where id_user= $1
 `;
return db.manyOrNone(sql, id_profile);

}
Product.GgetProfileFollowersIconSumProfile = (id_profile) =>{
	const sql = `
		SELECT 
  count(followers) as rate
FROM 
  followers where id_profile= $1
 `;
return db.manyOrNone(sql, id_profile);

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

Product.getTickets = (userId) =>{
	const sql = `
 		select * from tickets
		where user_id = $1
  order by id desc
 `;
return db.manyOrNone(sql, userId);

}

Product.getAllStocks = (id_company, id_company_product) =>{
	const sql = `
SELECT 
  products.id,
  categories.name AS nameCat,
  products.name,
  stock.stock,
  products.id_company
FROM products
INNER JOIN categories ON categories.id = products.id_category
INNER JOIN stock ON stock.id_product = products.id
WHERE stock.id_company = $1
  AND products.id_company = COALESCE($2, 1)
ORDER BY products.id_category;

 
 
 `;
return db.manyOrNone(sql, [id_company, id_company_product]);

}


Product.createReviewProduct = (comments) => {
    const sql = `
with rows as (
    INSERT INTO reviewsproducts(
		id_product, 
		id_user,
		review, 
		calification)
    VALUES($1,$2,$3,$4 )
	RETURNING id, id_user)
INSERT INTO commentsproducts(
	id_product, 
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
Product.createComent = (comments) => {
    const sql = `
with rows as (
    INSERT INTO coments_post(
		id_post, 
		id_user,
		coment 
		)
    VALUES($1,$2,$3 )
	RETURNING id, id_user)
INSERT INTO commentslikes_post(
	id_post,
   	id_user,
	username,
 	useremail
 )
SELECT id, id_user,$4, $4
FROM rows
    `;
    return db.oneOrNone(sql, [
        comments.id_plate,
        comments.id_user,
        comments.review,
	'0'    
    ]);
}
Product.likePublish = (id_publish, username ,useremail, id_user) => {
    const sql = `
    INSERT INTO commentslikes(
	id_publish, 
 	username,
  	useremail,
        id_user
	)
    VALUES($1, $2, $3, $4  ) RETURNING id
    
    `;
    return db.manyOrNone(sql, [id_publish, username, useremail, id_user]);
}

Product.createLikeComent = (id_coment, username ,useremail, id_user) => {
    const sql = `
    INSERT INTO commentslikes_post(
	id_post, 
 	username,
  	useremail,
        id_user
	)
    VALUES($1, $2, $3, $4  ) RETURNING id
    
    `;
    return db.manyOrNone(sql, [id_coment, username, useremail, id_user]);
}
Product.createLikePost = (id_publish, username ,useremail, id_user) => {
    const sql = `
    INSERT INTO likes_publish(
	id_publish, 
 	username,
  	useremail,
        id_user
	)
    VALUES($1, $2, $3, $4  ) RETURNING id
    
    `;
    return db.manyOrNone(sql, [id_publish, username, useremail, id_user]);
}
Product.deleteLikePost = (id) => {
    const sql = `

    DELETE  
    FROM likes_publish 

    WHERE id = $1
    `;
    return db.none(sql,id);
}


Product.createLikeProduct = (id_plate, username ,useremail, id_user) => {
    const sql = `
    INSERT INTO commentsproducts(
	id_product, 
 	username,
  	useremail,
        id_user
	)
    VALUES($1, $2, $3, $4  ) RETURNING id
    
    `;
    return db.manyOrNone(sql, [id_plate, username, useremail, id_user]);
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

Product.createLikeAnswerComent = (id_answer, username ,useremail, id_user) => {
    const sql = `
    INSERT INTO answerslikes_post(
	id_answer, 
 	username,
  	useremail,
        id_user
	)
    VALUES($1, $2, $3, $4  ) RETURNING id
    
    `;
    return db.manyOrNone(sql, [id_answer, username, useremail, id_user]);
}


Product.createLikeAnswerProduct = (id_answer, username ,useremail, id_user) => {
    const sql = `
    INSERT INTO answerslikesproducts(
	id_answer, 
 	username,
  	useremail,
        id_user
	)
    VALUES($1, $2, $3, $4  ) RETURNING id
    
    `;
    return db.manyOrNone(sql, [id_answer, username, useremail, id_user]);
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


Product.createAnswerPost = (id_coment, username , answer, responseto, id_user) => {
    const sql = `
		with rows as (
		    INSERT INTO answers_post(
				id_post, 
				username,
				answer,
				responseto,
    				userid_answer	
			)
		    VALUES($1,$2,$3,$4, $5 )
			RETURNING id, username )
		INSERT INTO answerslikes_post(
			id_answer, 
			username,
			useremail,
			id_user
		 )
		SELECT id, username, '0', $5
		FROM rows

    `;
    return db.manyOrNone(sql, [id_coment, username, answer, responseto,id_user ]);
}


Product.createAnswerProduct = (id_review, username , answer, responseto, id_user) => {
    const sql = `
		with rows as (
		    INSERT INTO answersproducts(
				id_review, 
				username,
				answer,
				responseto,
    				userid_answer	
			)
		    VALUES($1,$2,$3,$4, $5 )
			RETURNING id, username )
		INSERT INTO answerslikesproducts(
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

Product.createAnswer = (id_review, username , answer, responseto, id_user) => {
    const sql = `
		with rows as (
		    INSERT INTO answers(
				id_review, 
				username,
				answer,
				responseto,
    				userid_answer	
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
	   id,
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
    VALUES($1, $2, $3, $4, $5, $6, $7, $8,'true', $9, $10,'true', $11, $12, 13, $14) RETURNING id
    `;
    return db.oneOrNone(sql, [
	   plate.id,
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


Product.setFavoritesProducts = (id_plate, id_user) => {
    const sql = `
    INSERT INTO
        favoritesproducts(
	    id_product,  
            id_user
        )
    VALUES($1, $2)    
    `;
    return db.none(sql, [
        id_plate,
        id_user
    ]);
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
Product.setFollowersProfile = (id_profile, id_user) => {
    const sql = `
    INSERT INTO
        followers(
	    id_profile,  
            id_user
        )
    VALUES($1, $2)    
    `;
    return db.none(sql, [
        id_profile,
        id_user
    ]);
}

Product.setFavoritesProfile = (id_profile, id_user) => {
    const sql = `
    INSERT INTO
        favorites_profile(
	    id_profile,  
            id_user
        )
    VALUES($1, $2)    
    `;
    return db.none(sql, [
        id_profile,
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


Product.deleteAnswerLikeComent = (id) => {
    const sql = `

    DELETE  
    FROM answerslikes_post 

    WHERE id = $1
    `;
    return db.none(sql,id);
}

Product.deleteAnswerLikeProduct = (id) => {
    const sql = `

    DELETE  
    FROM answerslikesproducts 

    WHERE id = $1
    `;
    return db.none(sql,id);
}

Product.deleteAnswerLike = (id) => {
    const sql = `

    DELETE  
    FROM answerslikes 

    WHERE id = $1
    `;
    return db.none(sql,id);
}
Product.deleteLikeCommentPost = (id) => {
    const sql = `

    DELETE  
    FROM commentslikes_post 

    WHERE id = $1
    `;
    return db.none(sql,id);
}


Product.deleteLikeCommentProduct = (id) => {
    const sql = `

    DELETE  
    FROM commentsproducts 

    WHERE id = $1
    `;
    return db.none(sql,id);
}

Product.deleteLikeComment = (id) => {
    const sql = `

    DELETE  
    FROM commentslikes 

    WHERE id = $1
    `;
    return db.none(sql,id);
}

Product.deleteFavoritesProducts = (id_plate, id_user) => {
    const sql = `

    DELETE  
    FROM favoritesproducts 

    WHERE id_product = $1 and id_user = $2
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
Product.deleteFavoritesProfile = (id_profile, id_user) => {
    const sql = `

    DELETE  
    FROM favorites_profile 

    WHERE id_profile = $1 and id_user = $2
    `;
    return db.none(sql, [
        id_profile,
        id_user
    ]);
}
Product.deleteFollowersProfile = (id_profile, id_user) => {
    const sql = `

    DELETE  
    FROM followers 

    WHERE id_profile = $1 and id_user = $2
    `;
    return db.none(sql, [
        id_profile,
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
	P.price_buy,
	        COALESCE(json_agg(
		JSON_BUILD_OBJECT(
                'id', F.id,
				'product_id',F.id_product,
                'flavor', F.flavor,
				'id_company',F.id_company,
				'active',F.activate
		)
		)FILTER (WHERE F.id IS NOT NULL), '[]') as flavor 
					 FROM products as P
INNER JOIN 
	categories as C
ON
	p.id_category = C.id
left JOIN flavor as F on P.id = F.id_product		
WHERE C.id = $1
group by p.id

    
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
        p.id_category,
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

Product.findByCategoryStocks = (id_category, id_company, id_product_company) => {
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
	C.id = $1 and S.id_company = $2   AND P.id_company = COALESCE($3, 1)
    
    `;
    return db.manyOrNone(sql, [id_category, id_company, id_product_company]);
}

Product.getByCtaegoryAndProductNameSearch = (product_name) => {
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
	p.name ILIKE $1
    `;

    return db.manyOrNone(sql, [`%${product_name}%`]);
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

Product.setTicket = (ticketId) => {
    const sql = `
    UPDATE
        tickets
    SET
        active = 'used'
	where id = $1
    `;

    return db.none(sql, ticketId);
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

Product.getExtras = (id_plate) =>{
	const sql = `
select *
from extras where id_plate = $1 
`;
return db.manyOrNone(sql, id_plate);

}

Product.getIngredients = (id_plate) =>{
	const sql = `
select 
I.id,
I.id_plate,
I.ingredients,
P.image2

from ingredients as I
inner join plates as P on I.id_plate = P.id
where I.id_plate = $1 `;
return db.manyOrNone(sql, id_plate);

}


Product.createProductDealer = (product) => {
    const sql = `
    INSERT INTO 
        dealer_products(
            name,
            price,
            price_buy,
            price_sucursal,
            image1,
            created_at,
            state,
	    idsucursal,
     	    id_dealer,
	    grms,
     	    dispense
        )
    VALUES($1, $2, $3, $4, $5, $6, 'available',$7, $8, $9, $10) RETURNING id
    `;
    return db.oneOrNone(sql, [
        product.name,
        product.price,
        product.price_buy,
	product.price_sucursal,    
        product.image1,
        new Date(),
	product.idSucursal,
	product.id_dealer,
	product.grms,
	product.dispense
        
    ]);
}


Product.updateProductDealer = (product) => {
    const sql = `
    
    UPDATE
        dealer_products
    SET
	    image1 = $2

    where

        id = $1
        `;
    return db.none(sql, [
	product.id,
        product.image1  

    ]);

}


Product.getAlldealers = (idsucursal,id_dealer) =>{
	const sql = `
           select * from 
	   dealer_products where 
            idsucursal = $1 and id_dealer = $2 and state = 'available'
	order by dispense asc	
 `;
return db.manyOrNone(sql, [
	idsucursal,id_dealer
]);
}


Product.deleteDealer = (id) => {
    const sql = `
    UPDATE
        dealer_products
    SET
        state = 'delete'
	WHERE
        id = $1 
    `;

    return db.none(sql, [
        id
        
    ]);
}

Product.updateDealerName = (dealerid, name) => {
    const sql = `
    UPDATE
        dealer_dealers
    SET
        name = $2
	WHERE
        id = $1 
    `;
    return db.none(sql, [dealerid, name]);
}

Product.createDealer = (dealer) => {
    const sql = `
       INSERT INTO dealer_dealers(
	 machine, 
	 name, 
	 sucursal_id, 
	 status, 
	 type
 )
	VALUES (
	 $1,
	 $2, 
	 $3, 
	 $4, 
	 $5
 );
    `;
    return db.none(sql,[
	    dealer.machine,
	    dealer.name,
	    dealer.sucursal_id,
	    dealer.status,
	    dealer.type
    ]);
}


Product.deleteRepets = (idSucursal, dispense) => {
    const sql = `

	delete  from dealer_products
 where idSucursal = $1 and dispense = $2
    `;
    return db.none(sql,[idSucursal, dispense]);
}


Product.selectColors = (idSucursal) => {
    const sql = `

	select * from colors where company_id = $1
    `;
    return db.manyOrNone(sql,idSucursal);
}

Product.selectOcations = (idSucursal) => {
    const sql = `

	select * from ocation where id_company = $1
    `;
    return db.manyOrNone(sql,idSucursal);
}
Product.selectAroma = (idSucursal) => {
    const sql = `

	select * from aroma where id_company = $1
    `;
    return db.manyOrNone(sql,idSucursal);
}

Product.selectFlores = () =>{
	const sql = `
	select * from products where id_category = 124

 `;
return db.manyOrNone(sql);

}
Product.selectSizes = () =>{
	const sql = `
	select * from products where id_category = 125

 `;
return db.manyOrNone(sql);

}

module.exports = Product;
