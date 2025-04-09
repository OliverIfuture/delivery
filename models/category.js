const db = require('../config/config');

const Category = {};

Category.getAll = (id_category_company) => {
    const sql =
        `
 SELECT 
            id,
            name,
            description,
            image, 
            id_category_company
        FROM
            categories where name != 'SERVINGS' and id != 24 and id_category_company = $1
        ORDER BY 
            name 
        `;
    return db.manyOrNone(sql, id_category_company);
}

Category.getAllPlates = () => {
    const sql =
        `
        SELECT 
            id,
            name
        FROM
            categoriesPlates
        ORDER BY 
            id            
        `;
    return db.manyOrNone(sql);
}

Category.create =  (category) => {
    const sql =
        `
    INSERT INTO
        categories(
            name,
            description,
            created_at,
            updated_at,
            id_category_company
        )

     VALUES(
        $1,$2,$3,$4,$5
     )RETURNING id 
    
    
    `;
    return db.oneOrNone(sql, [
        category.name,
        category.description,
        new Date(),
        new Date()



    ]);
}

module.exports = Category;
