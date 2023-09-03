const Product = require('../models/product');
const storage = require('../utils/cloud_storage.js');
const asyncForEach = require('../utils/async_foreach');

module.exports = {

async setStock(req, res, next) {
        try {

            const stock = req.body;
            console.log(`stock enviada: ${stock}`);

            const data = await Product.setStock(stock);

            return res.status(201).json({
                message: ' el stock se actualizo  correctamente',
                success: true
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al actualizar stock',
                success: false,
                error: error
            });
        }
        
},

async updateStock (req, res, next) {
        try {

            const id_product = req.params.id_product;             
            const stock = req.params.stock; 
            const id_company = req.params.id_company; 

            const data = await Product.updateStockers(id_product, stock, id_company);
            console.log(`Nuevo stock: ${JSON.stringify(data)}`);


                return res.status(201).json({

                success: true,
                message: 'Estock actualizado',
            });
            
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error al actualizar',
                error: error
            });
        }
    },      

      async getAll(req, res, next) {
        try {
            const data = await Product.getAll();
            console.log(`Productos obtenidos: ${data}`);
            return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener'
            });
        }
    },

async getAllStocks (req, res, next) {

        try {
            const id_company = req.params.id_company;//envia el vliente
            const data = await Product.getAllStocks (id_company);
            console.log(`Productos obtenidos: ${data}`);

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

      async upateProduct(req, res, next) {
        try {

            let product = req.body;
             await Product.update(product);
            console.log(`Datos enviados del usuario: ${JSON.stringify(product)}`);


                return res.status(201).json({
                success: true,
                message: 'El producto se actualizo correctamente',
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error al actualizar el producto',
                error: error
            });
        }
    },   

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


    async findByCategoryStocks (req, res, next) {

        try {
            const id_category = req.params.id_category;//envia el vliente
            const id_company = req.params.id_company;//envia el vliente
    
            const data = await Product.findByCategoryStocks(id_category, id_company);

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


async findByCategoryAndProductNameStocks (req, res, next) {
        try {
            const id_category = req.params.id_category; // CLIENTE
            const product_name = req.params.product_name; // CLIENTE
            const id_company = req.params.id_company; // CLIENTE

            const data = await Product.findByCategoryAndProductNameStocks(id_category, product_name, id_company);
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

        async createTab(req, res, next) {
        
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

                const data = await Product.createTab(product);//ALMACENANDO VARIOS PRODUCTOS
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
    },
        async updateProduct(req, res, next) {
        try {
            
            const product = req.body;
            console.log(`Datos enviados del usuario: ${JSON.stringify(product)}`);
            

            await Product.updateStock(product);

            return res.status(201).json({
                succes: true,
                message: 'Stock Actualizado',

            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: false,
                message: 'Hubo un error con la actualizacion de stock',
                error: error

            });
        }
    },
       
    async delete(req, res, next) {
        try {

            const product = req.params;

            const data = await Product.delete(product.id);
            console.log(`Product to delete: ${JSON.stringify(data)}`);


                return res.status(201).json({

                success: true,
                message: 'producto eliminado correctamente',
            });
            
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error eliminando el producto',
                error: error
            });
        }
    },
      
    async deleteSale(req, res, next) {
        try {

            const product = req.params;

            const data = await Product.deleteSale(product.id);
            console.log(`Product to delete: ${JSON.stringify(data)}`);


                return res.status(201).json({

                success: true,
                message: 'venta eliminada correctamente',
            });
            
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error eliminando la venta',
                error: error
            });
        }
    },


async findMyProduct(req, res, next) {
        try {

            const name = req.params.name;

            const data = await Product.findMyProduct(name);
            console.log(`Datos enviados del product: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener el producto por nombre'
            });
        }
    },      

}
