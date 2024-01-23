const db = require('../config/config');
const Product = {};


Product.getAll = () =>{
	const sql = `
		 select * from products
		 order by id_category
 
 
 `;
return db.manyOrNone(sql);

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
	   idCategory,
	   stock,
	   priceSpecial,
	   priceBuy,
	   state,
	   priceWholesale,
	   carbs,
	   protein,
	   calorias
            
        )
    VALUES($1, $2, $3, $4, $5, $6, $7, 'true', $9, $10,'true',$12, $13, $14, $15) RETURNING id
    `;
    return db.oneOrNone(sql, [
	   plate.name,
	   plate.description,
	   plate.price,
	   plate.image1,
	   plate.image2,
	   plate.image3,
	   plate.idCategory,
	   plate.stock,
	   plate.priceSpecial,
	   plate.priceBuy,
	   plate.state,
	   plate.priceWholesale,
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
