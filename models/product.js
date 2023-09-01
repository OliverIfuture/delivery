const db = require('../config/config');
const Product = {};


Product.getAll = () =>{
	const sql = `
		 select * from products
		 order by id_category
 
 
 `;
return db.manyOrNone(sql);

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
     	    state
	    
            
        )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, 'true',$10 ,$11 ,$12 ,$13) RETURNING id
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
	product.state
        
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
	P.price_buy
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

Product.update = (product) => {
    const sql = `
    
    UPDATE
        products
    SET
            name =$2,
            description = $3,
            price = $4, 
	    state = $5,
            price_special = $6,
	    price_buy = $7
    where

        id = $1
        `;
    return db.none(sql, [
        product.id,
        product.name,
        product.description,
        product.price,
        product.state,
        product.price_special,
        product.price_buy
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
module.exports = Product;
