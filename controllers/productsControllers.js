const Product = require('../models/product');
const storage = require('../utils/cloud_storage.js');
const asyncForEach = require('../utils/async_foreach');

module.exports = {

    async findByCategory(req, res, next) {

        try {
            const id_category = req.params.id_category;//envia el vliente
            const data = await Product.findByCategory(id_category);

            return res.status(201).json(data);

            
        } catch (error) {
                console.log(`Error: ${error}`);
                return res.status(500).json({
                message: `Error al listar los productos por categoria ${error}`,
                success: false,
                error: error
                 });
        }
    },

        async findByCategoryAndProductName(req, res, next) {
        try {
            const id_category = req.params.id_category; // CLIENTE
            const product_name = req.params.product_name; // CLIENTE
            const data = await Product.findByCategoryAndProductName(id_category, product_name);
            return res.status(201).json(data);
        } 
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: `Error al listar los productos por categoria`,
                success: false,
                error: error
            });
        }
    },

    async create(req, res, next) {
        
        let product = JSON.parse(req.body.product);
        console.log(`Producto: ${JSON.stringify(product)}`);

        const files = req.files;

        let inserts = 0;

        if (files.length === 0) {
            return res.status(501).json({
                message: 'Error al registrar el producto no tiene imagen',
                success: false
            });
        }

        else if (files.length > 0 && files.length <= 3 ){
            try {

                const data = await Product.create(product);//ALMACENANDO VARIOS PRODUCTOS
                product.id = data.id;

                const start = async () => {
                    await asyncForEach(files, async (file) => {
                        const pathImage = `image_${Date.now()}`;
                        const url = await storage(file, pathImage);

                        if (url !== undefined && url !== null) {
                            if (inserts == 0) {//imagen1
                                product.image1 = url;

                            }

                            else if (inserts == 1) {//imagen2
                                product.image2 = url;

                            
                            }
                            
                            else if (inserts == 2) {//imagen3
                                product.image3 = url;

                            
                            }
                        }

                        await Product.update(product);
                        inserts = inserts + 1;
                        if (inserts == files.length) {
                            return res.status(201).json({
                                success: true,
                                message: 'Producto registrado correctamente'

                            });
                        }
                    });
                }

                start();

                
            } catch (error) {
                console.log(`Error: ${error}`);
                return res.status(500).json({
                message: `Error al registrar el producto ${error}`,
                success: false,
                error:error
                
                });
            }

        }
    }

,
        async updateProduct(req, res, next) {
        try {
            
            const product = JSON.parse(req.body.product);
            console.log(`Datos enviados del usuario: ${product}`);
            

            await Product.updateStock(product);

            return res.status(201).json({
                succes: true,
                message: 'Los datos del usuario se actualizaron correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: false,
                message: 'Hubo un error con la actualizacion de datos del ususario',
                error: error

            });
        }
    },


}
