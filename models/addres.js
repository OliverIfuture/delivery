const db = require('../config/config');

const Address = {};



Address.findByUser = (id_user) => {
    const sql = `
    
        SELECT
            id,
            id_user,
            address,
            neighborhood,
            lat,
            lng
        FROM 
            address   
        WHERE
            id_user = $1     
        order by id desc    
    `;  
    return db.manyOrNone(sql, id_user);
}

Address.delete = (id, id_user) => {
    const sql = `

    DELETE 
    
    FROM address 

    WHERE id = $1 and id_user = $2 
    `;

    return db.none(sql, [
        id,
        id_user
        
    ]);
}

Address.create = (address) => {
    const sql = `

    INSERT INTO 
    address(
            id_user,
            address,
            neighborhood,
            lat,
            lng,
            created_at,
            updated_at,
            active
        )

    VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `;

    return db.oneOrNone(sql, [
        address.id_user,
        address.address,
        address.neighborhood,
        address.lat,
        address.lng,
        new Date(),
        new Date(),
        address.active
    ]);
}

Address.findPromoByGym = (id_company) => {
    const sql = `
        select 
        	P.id,
        	P.name,
        	P.description,
        	P.available,
        	        JSON_BUILD_OBJECT(
                    'id', U.id,
                    'name', U.name,
                    'addres', U.addres,
                    'telephone', U.telephone,
             	    'logo', U.logo,
                    'available', U.available
                ) AS company
        from dealer_promo as P
        
        inner join dealer_sucursal as U
        	on P.id_company = U.id
        
        where U.id = $1
         
    `;  
    return db.manyOrNone(sql, id_company);
}


module.exports = Address;
