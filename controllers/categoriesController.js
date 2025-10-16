const Category = require('../models/category');

module.exports = {

    async getAll(req, res, next) {
        try {
            const id_category_company = req.params.id_category_company ?? 4; // <= valor por defecto
            const data = await Category.getAll(id_category_company);
            console.log(`Categorias: ${JSON.stringify(data)}`);
            return res.status(201).json(data);
            
        } catch (error) {
            
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las categorias',
                error: error,
                success: false
            

            });
        }
    },

        async getAllByStore(req, res, next) {
        try {
            const id_category_company = req.params.id_category_company
            const data = await Category.getAllByStore(id_category_company);
            console.log(`Categorias: ${JSON.stringify(data)}`);
            return res.status(201).json(data);
            
        } catch (error) {
            
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las categorias',
                error: error,
                success: false
            

            });
        }
    },

        async getAllPlates(req, res, next) {
        try {
            const data = await Category.getAllPlates();
            console.log(`Categorias: ${JSON.stringify(data)}`);
            return res.status(201).json(data);
            
        } catch (error) {
            
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las categorias',
                error: error,
                success: false
            

            });
        }
    },

    async create(req, res, next) {
        try {

            const category = req.body;
            console.log(`Categoria enviada: ${category}`);

            const data = await Category.create(category);

            return res.status(201).json({
                message: ' la categoria se creo correctamente',
                success: true,
                data: data.id

            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al crear la categoria',
                success: false,
                error: error
            });
        }
        
}

    async delete(req, res, next) {
        try {

            const id = req.params.id;
            console.log(`Categoria enviada: ${id}`);

            const data = await Category.delete(id);

            return res.status(201).json({
                message: ' la categoria se elimino correctamente',
                success: true,
                data: data.id

            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al eliminar la categoria',
                success: false,
                error: error
            });
        }
        
}


}
