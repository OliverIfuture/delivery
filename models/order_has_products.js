const db = require('../config/config');

const OrderHasProducts = {};



OrderHasProducts.create = (id_order, id_product, quantity) => {
    const sql = `

    INSERT INTO 
    order_has_products(
            id_order,
            id_product,
            quantity,
            created_at,
            updated_at
        )

    VALUES($1, $2, $3, $4, $5)
    `;

    return db.none(sql, [
        id_order,
        id_product,
        quantity,
        new Date(),
        new Date()
    ]);
}

OrderHasProducts.createSale = (name, price, image1, price_buy, reference) => {
    const sql = `

    INSERT INTO 
    sales(
            product_name,
            product_price,
            image_product,
            product_coast,
            reference
        )

    VALUES($1, $2, $3, $4, $5)
    `;

    return db.none(sql, [
        name, 
        price, 
        image1, 
        price_buy, 
        reference
    ]);
}

module.exports = OrderHasProducts;
