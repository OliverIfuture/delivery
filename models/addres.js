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
SELECT
        id::text,
        trade_name::text AS name,
        address::text,
        ''::text AS apt,
        pickup_notes::text AS notes,
        latitude::numeric AS lat,
        longitude::numeric AS lng,
        telephone::text AS phone,
        is_default,              -- 🔥 AHORA USAMOS EL CAMPO REAL
        created_at::timestamp
    FROM
        cobi_companies
    WHERE
        id = $1::uuid

    UNION ALL

    SELECT
        id::text,
        name::text,
        address::text,
        apt::text,
        notes::text,
        lat::numeric,
        lng::numeric,
        phone::text,
        is_default,
        created_at::timestamp
    FROM
        company_locations
    WHERE
        company_id = $1::text

    ORDER BY
        is_default DESC, created_at DESC
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
        location.company_id, // Asegúrate de mandar camelCase desde Flutter
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
    // 1. Apagamos TODOS los defaults en ambas tablas para esta empresa
    await db.none('UPDATE company_locations SET is_default = false WHERE company_id = $1', [companyId]);
    await db.none('UPDATE cobi_companies SET is_default = false WHERE id = $1', [companyId]);

    // 2. Encendemos el correcto. 
    // Si el locationId es exactamente igual al companyId, significa que seleccionaron la Matriz.
    if (locationId === companyId) {
        return db.none('UPDATE cobi_companies SET is_default = true WHERE id = $1', [companyId]);
    } else {
        // Si es diferente, seleccionaron una sucursal (cuyo ID es numérico en company_locations)
        return db.none('UPDATE company_locations SET is_default = true WHERE id = $1', [locationId]);
    }
};


// 1. OBTENER TODAS LAS PREFERENCIAS (Matriz + Sucursales)
Address.findByCompanyPref = (companyId) => {
    // 🪄 MAGIA SQL: Unimos la Matriz y las Sucursales, y luego cruzamos sus preferencias.
    // Usamos COALESCE para que, si no hay preferencias guardadas, envíe los valores por defecto.
    const sql = `
WITH AllLocations AS (
    -- Obtenemos la Matriz
    SELECT
        id::text AS location_id,
        trade_name::text AS location_name,
        true AS is_matriz,
        id::text AS company_id,
        latitude AS lats, -- 🔥 Latitud de la matriz
        longitude AS lng  -- 🔥 Longitud de la matriz
    FROM cobi_companies
    WHERE id = $1

    UNION ALL

    -- Obtenemos las Sucursales extras
    SELECT
        id::text AS location_id,
        name::text AS location_name,
        false AS is_matriz,
        company_id::text AS company_id,
        lat, -- 🔥 Latitud de la sucursal
        lng  -- 🔥 Longitud de la sucursal
    FROM company_locations
    WHERE company_id = $1
)
SELECT
    al.location_id,
    al.location_name,
    al.is_matriz,
    al.company_id,
    al.lat, -- 🔥 Se exponen para enviarlas a Flutter/Uber
    al.lng, -- 🔥 Se exponen para enviarlas a Flutter/Uber
    sp.id,
    COALESCE(sp.default_vehicle, 'moto') as default_vehicle,
    COALESCE(sp.preparation_time_minutes, 15) as preparation_time_minutes,
    COALESCE(sp.auto_dispatch, true) as auto_dispatch,
    COALESCE(sp.pickup_notes, '') as pickup_notes
FROM AllLocations al
LEFT JOIN cobi_shipping_preferences sp
    ON al.location_id = sp.location_id AND al.company_id::uuid = sp.company_id
ORDER BY al.is_matriz DESC, al.location_name ASC;
    `;

    return db.manyOrNone(sql, [companyId]);
};

// 2. UPSERT: Guardar o Actualizar Preferencias
Address.upsert = (pref) => {
    // ON CONFLICT nos salva la vida aquí. Si ya existe la preferencia para esa sucursal, solo la actualiza.
    const sql = `
        INSERT INTO cobi_shipping_preferences (
            company_id, location_id, is_matriz, default_vehicle, 
            preparation_time_minutes, auto_dispatch, pickup_notes
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (company_id, location_id) 
        DO UPDATE SET 
            default_vehicle = EXCLUDED.default_vehicle,
            preparation_time_minutes = EXCLUDED.preparation_time_minutes,
            auto_dispatch = EXCLUDED.auto_dispatch,
            pickup_notes = EXCLUDED.pickup_notes,
            updated_at = CURRENT_TIMESTAMP;
    `;

    return db.none(sql, [
        pref.company_id,
        pref.location_id,
        pref.is_matriz,
        pref.default_vehicle,
        pref.preparation_time_minutes,
        pref.auto_dispatch,
        pref.pickup_notes
    ]);
};

Address.update = (location) => {
    if (location.id === location.company_id) {

        // CAMINO 1: Es la Matriz (Actualizamos cobi_companies)
        // Nota: Usamos 'trade_name' porque así se llama la columna en esta tabla
        const sql = `
            UPDATE cobi_companies
            SET 
                trade_name = $1,
                address = $2,
                telephone = $3,
                latitude = $4,
                longitude = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
        `;
        return db.none(sql, [
            location.name,
            location.address,
            location.phone,
            location.lat,
            location.lng,
            location.id // Es el UUID
        ]);

    } else {

        // CAMINO 2: Es una Sucursal (Actualizamos company_locations)
        const sql = `
            UPDATE company_locations
            SET 
                name = $1,
                address = $2,
                apt = $3,
                notes = $4,
                phone = $5,
                lat = $6,
                lng = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8 AND company_id = $9
        `;
        return db.none(sql, [
            location.name,
            location.address,
            location.apt,
            location.notes,
            location.phone,
            location.lat,
            location.lng,
            location.id, // Aquí ya es un número entero (Ej. 5)
            location.company_id
        ]);
    }
};

// ==========================================
// ELIMINAR UBICACIÓN
// ==========================================
Address.cobidelete = (idLocation) => {
    // 🔥 PROTECCIÓN: Si el ID contiene guiones, es un UUID (La Matriz). 
    // No permitimos que borren la empresa matriz desde esta pantalla.
    if (String(idLocation).includes('-')) {
        throw new Error('No puedes eliminar la sucursal principal (Matriz).');
    }

    const sql = `
        DELETE FROM company_locations
        WHERE id = $1
    `;

    return db.none(sql, [idLocation]);
};

module.exports = Address;
