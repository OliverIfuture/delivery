const db = require('../config/config.js');

const POS = {};

// --- Turnos (Shifts) ---

POS.startShift = (id_company, id_user_staff, starting_cash) => {
    const sql = `
        INSERT INTO pos_shifts(id_company, id_user_staff, starting_cash, status, start_time)
        VALUES($1, $2, $3, 'OPEN', $4)
        RETURNING id
    `;
    return db.one(sql, [id_company, id_user_staff, starting_cash, new Date()]);
};

// Busca un turno que ya esté abierto para este staff en este gimnasio
POS.findActiveShift = (id_company, id_user_staff) => {
    const sql = `
        SELECT * FROM pos_shifts
        WHERE id_company = $1 AND id_user_staff = $2 AND status = 'OPEN'
        LIMIT 1
    `;
    return db.oneOrNone(sql, [id_company, id_user_staff]);
};

// Cierra el turno
POS.closeShift = (id_shift, ending_cash, total_cash_sales, total_card_sales, total_sales, notes) => {
    const sql = `
        UPDATE pos_shifts
        SET 
            end_time = $1,
            ending_cash = $2,
            total_cash_sales = $3,
            total_card_sales = $4,
            total_sales = $5,
            notes = $6,
            status = 'CLOSED'
        WHERE id = $7
    `;
    return db.none(sql, [new Date(), ending_cash, total_cash_sales, total_card_sales, total_sales, notes, id_shift]);
};

// --- Productos (Products) ---

POS.getProductsByCompany = (id_company) => {
    const sql = `
        SELECT * FROM pos_products
        WHERE id_company = $1 AND is_active = true
        ORDER BY name ASC
    `;
    return db.manyOrNone(sql, id_company);
};

POS.createProduct = (product) => {
    const sql = `
        INSERT INTO pos_products(id_company, name, price, stock, image_url, created_at, updated_at)
        VALUES($1, $2, $3, $4, $5, $6, $6)
        RETURNING id
    `;
    return db.one(sql, [product.id_company, product.name, product.price, product.stock, product.image_url, new Date()]);
};

POS.updateProduct = (product) => {
    const sql = `
        UPDATE pos_products
        SET name = $1, price = $2, stock = $3, image_url = $4, is_active = $5, updated_at = $6
        WHERE id = $7 AND id_company = $8
    `;
    return db.none(sql, [product.name, product.price, product.stock, product.image_url, product.is_active, new Date(), product.id, product.id_company]);
};

// Baja de stock (se llama después de una venta)
POS.updateProductStock = (id_product, quantity_sold) => {
    const sql = `
        UPDATE pos_products
        SET stock = stock - $1
        WHERE id = $2
    `;
    return db.none(sql, [quantity_sold, id_product]);
};

// --- Ventas (Sales) ---

POS.createSale = (sale) => {
    const sql = `
        INSERT INTO pos_sales(
            id_shift,
            id_company,
            id_user_staff,
            id_client,
            sale_details,
            subtotal,
            total,
            payment_method,
            created_at
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
    `;
    return db.one(sql, [
        sale.id_shift,
        sale.id_company,
        sale.id_user_staff,
        sale.id_client, // Puede ser null
        sale.sale_details, // El JSON de productos
        sale.subtotal,
        sale.total,
        sale.payment_method,
        new Date()
    ]);
};

// Obtiene todas las ventas de un turno (para el corte de caja)
POS.getSalesByShift = (id_shift) => {
    const sql = `
        SELECT * FROM pos_sales
        WHERE id_shift = $1
        ORDER BY created_at ASC
    `;
    return db.manyOrNone(sql, id_shift);
};

module.exports = POS;
