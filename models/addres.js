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
            id_user = $1  and active = true   
        order by id desc    
    `;
    return db.manyOrNone(sql, id_user);
}

Address.delete = (id, id_user) => {
    const sql = `

        UPDATE address
        	SET active= false
        	WHERE id = $1;
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
        true
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



Address.findByCompany = (companyId) => {
    const sql = `
    SELECT * FROM company_locations 
    WHERE company_id = $1
    ORDER BY is_default DESC, created_at DESC
    `;
    return db.manyOrNone(sql, [companyId]);
};

Address.cobicreate = (location) => {
    const sql = `
    INSERT INTO company_locations(
        company_id, name, address, apt, notes, lat, lng, phone, is_default, created_at, updated_at
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
    ) RETURNING id
    `;
    return db.oneOrNone(sql, [
        location.companyId, // Asegúrate de mandar camelCase desde Flutter
        location.name,
        location.address,
        location.apt,
        location.notes,
        location.lat,
        location.lng,
        location.phone,
        location.isDefault,
        new Date(),
        new Date()
    ]);
};

Address.setDefault = async (locationId, companyId) => {
    // 1. Quitamos el default a todas las sucursales de esta empresa
    const sqlRemoveAll = `UPDATE company_locations SET is_default = false WHERE company_id = $1`;
    await db.none(sqlRemoveAll, [companyId]);

    // 2. Le ponemos default solo a la seleccionada
    const sqlSetNew = `UPDATE company_locations SET is_default = true WHERE id = $1`;
    return db.none(sqlSetNew, [locationId]);
};


module.exports = Address;
