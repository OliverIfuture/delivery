const Product = require('../models/product');
const storage = require('../utils/cloud_storage.js');
const asyncForEach = require('../utils/async_foreach');

module.exports = {

 async getUserProfile(req, res, next) {
        try {

            const id = req.params.id;    
            const data = await Product.getUserProfile(id);
            console.log(`Favoritos obtenidos: ${data}`);
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
 
 async deletePost (req, res, next) {
        try {

            const id = req.params.id;
            const id_user = req.params.id_user;
            const data = await Product.deletePost(id, id_user);

            return res.status(201).json({
                message: 'El post se elimino correctamente',
                success: true
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al eliminar el post',
                success: false,
                error: error
            });
        }
        
},

async getPostAll(req, res, next) {
        try {            
         
         
            const data = await Product.getPostAll();
            console.log(`Status: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener posts'
            });
        }
    },
 
 async getPost(req, res, next) {
        try {            
         
         
           const id_user = req.params.id_user;    
            const data = await Product.getPost(id_user);
            console.log(`post  obtenidos: ${data}`);
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
 async createPost(req, res, next) {
        try {
            
            const id_user = req.params.id_user;
            const description = req.params.description;
            const files = req.files;
            let image;

            if (files.length > 0) {
                const pathImage = `image_${Date.now()}`;
                const url = await storage(files[0], pathImage);
                
                if (url != undefined && url != null) {
                    image = url;

                }
            }


            const data = await Product.createPost(id_user, description, image);
           return res.status(201).json({

                success: true,
                message: 'El registro se ralizo correctamente',
            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: true,
                message: 'error al publicar',
                error: error

            });
        }
    },        

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


     async getFavorites(req, res, next) {

        try {
            const id_user = req.params.id_user;
            const data = await Product.getFavorites(id_user);
             console.log(`stock enviada: ${data}`);

            return res.status(201).json(data);

            
        } catch (error) {
                console.log(`Error: ${error}`);
                return res.status(500).json({
                message: `Error al listar los productos por favoritos ${error}`,
                success: false,
                error: error
                 });
        }
    },       
    async getSaves(req, res, next) {

        try {
            const id_user = req.params.id_user;
            const data = await Product.getSaves(id_user);
             console.log(`stock enviada: ${data}`);

            return res.status(201).json(data);

            
        } catch (error) {
                console.log(`Error: ${error}`);
                return res.status(500).json({
                message: `Error al listar los productos por favoritos ${error}`,
                success: false,
                error: error
                 });
        }
    },  
       async GgetProfileFollowersIconSumProfile(req, res, next) {

        try {
            const id_profile = req.params.id_profile;
            const data = await Product.GgetProfileFollowersIconSumProfile(id_profile);
             console.log(`stock enviada: ${data}`);

            return res.status(201).json(data);

            
        } catch (error) {
                console.log(`Error: ${error}`);
                return res.status(500).json({
                message: `Error al listar los corazones de este platillo ${error}`,
                success: false,
                error: error
                 });
        }
    },
       async getProfilePlatesIconSumProfile(req, res, next) {

        try {
            const id_profile = req.params.id_profile;
            const data = await Product.getProfilePlatesIconSumProfile(id_profile);
             console.log(`stock enviada: ${data}`);

            return res.status(201).json(data);

            
        } catch (error) {
                console.log(`Error: ${error}`);
                return res.status(500).json({
                message: `Error al listar los corazones de este platillo ${error}`,
                success: false,
                error: error
                 });
        }
    },
        
       async getProfileFavoriteIconSum(req, res, next) {

        try {
            const id_profile = req.params.id_profile;
            const data = await Product.getProfileFavoriteIconSum(id_profile);
             console.log(`stock enviada: ${data}`);

            return res.status(201).json(data);

            
        } catch (error) {
                console.log(`Error: ${error}`);
                return res.status(500).json({
                message: `Error al listar los corazones de este platillo ${error}`,
                success: false,
                error: error
                 });
        }
    }, 
       async getReviewPlateFavoriteIcon(req, res, next) {

        try {
            const id_plate = req.params.id_plate;
            const data = await Product.getReviewPlateFavoriteIcon(id_plate);
             console.log(`stock enviada: ${data}`);

            return res.status(201).json(data);

            
        } catch (error) {
                console.log(`Error: ${error}`);
                return res.status(500).json({
                message: `Error al listar los corazones de este platillo ${error}`,
                success: false,
                error: error
                 });
        }
    },     

    async getReviewPlateRate(req, res, next) {

        try {
            const id_plate = req.params.id_plate;
            const data = await Product.getReviewPlateRate(id_plate);
             console.log(`stock enviada: ${data}`);

            return res.status(201).json(data);

            
        } catch (error) {
                console.log(`Error: ${error}`);
                return res.status(500).json({
                message: `Error al listar los review de este platillo ${error}`,
                success: false,
                error: error
                 });
        }
    }, 


     async findLikes(req, res, next) {
        try {
            const id_plate = req.params.id_plate;

            const data = await Product.findLikes(id_plate);
            console.log(`Status: ${JSON.stringify(data)}`);
            return res.status(201).json(data);
            
        } catch (error) {
            
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener los favoritos',
                error: error,
                success: false
            

            });
        }
    },       
     async getAnswers(req, res, next) {
        try {
            const id = req.params.id;

            const data = await Product.getAnswers(id);
            console.log(`Status: ${JSON.stringify(data)}`);
            return res.status(201).json(data);
            
        } catch (error) {
            
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al tratar de obtener las respuestas',
                error: error,
                success: false
            

            });
        }
    },

async findFollowersProfile(req, res, next) {
        try {
            const id_profile = req.params.id_profile;
            const id_user = req.params.id_user;     
            const code = await Product.findFollowersProfile(id_profile, id_user);
             console.log(`stock enviada: ${code}`);

            if (!code) {
                return res.status(401).json({
                    success: false,
                    message: 'El codigo no fue encontrado'
                });
            }

            else{
                return res.status(201).json({
                success: true,
                message: 'codigo aplicado',
            });
            }

 
        } 
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al momento de hacer login',
                error: error
            });
        }
    },          
async findFavoritesProfile(req, res, next) {
        try {
            const id_profile = req.params.id_profile;
            const id_user = req.params.id_user;     
            const code = await Product.findFavoritesProfile(id_profile, id_user);
             console.log(`stock enviada: ${code}`);

            if (!code) {
                return res.status(401).json({
                    success: false,
                    message: 'El codigo no fue encontrado'
                });
            }

            else{
                return res.status(201).json({
                success: true,
                message: 'codigo aplicado',
            });
            }

 
        } 
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al momento de hacer login',
                error: error
            });
        }
    },     
 async findFavorites(req, res, next) {
        try {
            const id_plate = req.params.id_plate;
            const id_user = req.params.id_user;     
            const code = await Product.findFavorites(id_plate, id_user);
             console.log(`stock enviada: ${code}`);

            if (!code) {
                return res.status(401).json({
                    success: false,
                    message: 'El codigo no fue encontrado'
                });
            }

            else{
                return res.status(201).json({
                success: true,
                message: 'codigo aplicado',
            });
            }

 
        } 
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al momento de hacer login',
                error: error
            });
        }
    },


 async findSaves(req, res, next) {
        try {
            const id_plate = req.params.id_plate;
            const id_user = req.params.id_user;     
            const code = await Product.findSaves(id_plate, id_user);
             console.log(`stock enviada: ${code}`);

            if (!code) {
                return res.status(401).json({
                    success: false,
                    message: 'El codigo no fue encontrado'
                });
            }

            else{
                return res.status(201).json({
                success: true,
                message: 'codigo aplicado',
            });
            }

 
        } 
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al momento de hacer login',
                error: error
            });
        }
    },
        
async findReview(req, res, next) {
        try {
            const id = req.params.id;
            const data = await Product.findReview(id);
            console.log(`Reviews obtenidos: ${JSON.stringify(data)}`);
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

async setFavorites(req, res, next) {
        try {

            const id_plate = req.params.id_plate;             
            const id_user = req.params.id_user; 
            const data = await Product.setFavorites(id_plate, id_user);

            return res.status(201).json({
                message: 'agregado a favoritos',
                success: true
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al agregar',
                success: false,
                error: error
            });
        }
        
},

async setFollowersProfile(req, res, next) {
        try {

            const id_profile = req.params.id_profile;             
            const id_user = req.params.id_user; 
            const data = await Product.setFollowersProfile(id_profile, id_user);

            return res.status(201).json({
                message: 'Me gusta',
                success: true
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al agregar',
                success: false,
                error: error
            });
        }
        
},
        
async setFavoritesProfile(req, res, next) {
        try {

            const id_profile = req.params.id_profile;             
            const id_user = req.params.id_user; 
            const data = await Product.setFavoritesProfile(id_profile, id_user);

            return res.status(201).json({
                message: 'Me gusta',
                success: true
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al agregar',
                success: false,
                error: error
            });
        }
        
},
        
async setSave(req, res, next) {
        try {

            const id_plate = req.params.id_plate;             
            const id_user = req.params.id_user; 
            const data = await Product.setSave(id_plate, id_user);

            return res.status(201).json({
                message: 'agregado a guardados',
                success: true
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al agregar',
                success: false,
                error: error
            });
        }
        
},
async deleteFavorites (req, res, next) {
        try {

            const id_plate = req.params.id_plate;             
            const id_user = req.params.id_user; 
            const data = await Product.deleteFavorites (id_plate, id_user);

            return res.status(201).json({
                message: 'eliminado de favoritos',
                success: true
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al eliminar',
                success: false,
                error: error
            });
        }
        
},

async deleteFollowersProfile (req, res, next) {
        try {

            const id_profile = req.params.id_profile;             
            const id_user = req.params.id_user; 
            const data = await Product.deleteFollowersProfile (id_profile, id_user);

            return res.status(201).json({
                message: 'eliminado de favoritos',
                success: true
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al eliminar',
                success: false,
                error: error
            });
        }
        
},         
async deleteFavoritesProfile (req, res, next) {
        try {

            const id_profile = req.params.id_profile;             
            const id_user = req.params.id_user; 
            const data = await Product.deleteFavoritesProfile (id_profile, id_user);

            return res.status(201).json({
                message: 'eliminado de favoritos',
                success: true
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al eliminar',
                success: false,
                error: error
            });
        }
        
}, 
async deleteAnswerLike (req, res, next) {
        try {

            const id = req.params.id; 
            const data = await Product.deleteAnswerLike (id);

            return res.status(201).json({
                message: 'like eliminado',
                success: true
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al eliminar',
                success: false,
                error: error
            });
        }
        
},  
        
async deleteLikeComment (req, res, next) {
        try {

            const id = req.params.id; 
            const data = await Product.deleteLikeComment (id);

            return res.status(201).json({
                message: 'like eliminado',
                success: true
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al eliminar',
                success: false,
                error: error
            });
        }
        
},  
        
async deleteteSave (req, res, next) {
        try {

            const id_plate = req.params.id_plate;             
            const id_user = req.params.id_user; 
            const data = await Product.deleteteSave (id_plate, id_user);

            return res.status(201).json({
                message: 'eliminado de guardados',
                success: true
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al eliminar',
                success: false,
                error: error
            });
        }
        
},        

async updateStockers (req, res, next) {
        try {

            const id_product = req.params.id_product;             
            const stock = req.params.stock; 
            const id_company = req.params.id_company; 
            console.log(`Nuevo stock: ${id_product} ${stock} ${id_company}`);

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
async lookFavoritesList(req, res, next) {
        try {

            const id_profile = req.params.id_profile;    
            const data = await Product.lookFavoritesList(id_profile);
            console.log(`Favoritos obtenidos: ${data}`);
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
async lookFollowersList (req, res, next) {
        try {

            const id_profile = req.params.id_profile;    
            const data = await Product.lookFollowersList (id_profile);
            console.log(`seguidores obtenidos: ${data}`);
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
async favoritesplates(req, res, next) {
        try {

            const id = req.params.id;    
            const data = await Product.favoritesplates(id);
            console.log(`Favoritos obtenidos: ${data}`);
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

 async findLast5(req, res, next) {
        try {
            const data = await Product.findLast5();
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

 async getByCtaegoryPlate(req, res, next) {

        try {
            const id_category = req.params.id_category;//envia el vliente
            const data = await Product.getByCtaegoryPlate(id_category);

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


 async getByCtaegoryAndProductNamePlate(req, res, next) {
        try {
            const id_category = req.params.id_category; // CLIENTE
            const product_name = req.params.product_name; // CLIENTE
            const data = await Product.getByCtaegoryAndProductNamePlate(id_category, product_name);
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


      async createPLate(req, res, next) {
        
        let plate = JSON.parse(req.body.plate);
        console.log(`plate: ${JSON.stringify(plate)}`);

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

                const data = await Product.createPLate(plate);//ALMACENANDO VARIOS PRODUCTOS
                plate.id = data.id;

                const start = async () => {
                    await asyncForEach(files, async (file) => {
                        const pathImage = `image_${Date.now()}`;
                        const url = await storage(file, pathImage);

                        if (url !== undefined && url !== null) {
                            if (inserts == 0) {//imagen1
                                plate.image1 = url;

                            }

                            else if (inserts == 1) {//imagen2
                                plate.image2 = url;

                            
                            }
                            
                            else if (inserts == 2) {//imagen3
                                plate.image3 = url;

                            
                            }
                        }
                 console.log(`plato numero 2: ${JSON.stringify(plate)}`);


                        await Product.updatePlate(plate);
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

async updateAdmin(req, res, next) {
        try {
            
            const product = req.body;
            console.log(`Datos enviados del usuario: ${JSON.stringify(product)}`);
            

            await Product.updateAdmin(product);

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


       async getAllCompany(req, res, next) {
        try {
            const data = await Product.getAllCompany();
            console.log(`Datos enviados del usuario: ${JSON.stringify(data)}`);
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
       
async getGift(req, res, next) {
        try {
            const data = await Product.getGift();
            console.log(`Datos del Gift: ${JSON.stringify(data)}`);
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


async getGifts(req, res, next) {
        try {
            const data = await Product.getGifts();
            console.log(`Datos del Gift: ${JSON.stringify(data)}`);
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

        
async turnOff(req, res, next) {
        try {
            
            await Product.turnOff();

            return res.status(201).json({
                succes: true,
                message: 'Cupones apagados',

            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: false,
                message: 'Hubo un error al apagar cupones',
                error: error

            });
        }
    },      


  async turnOn(req, res, next) {
        try {

            const id = req.params.id;
            await Product.turnOn(id);

            return res.status(201).json({
                succes: true,
                message: 'Cupon Activado',

            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: false,
                message: 'Hubo un error al apagar cupones',
                error: error

            });
        }
    }, 

  async createAnswer (req, res, next) {
        try {

            const id_review = req.params.id_review; 
            const username = req.params.username;  
            const answer = req.params.answer;  
            const responseto = req.params.responseto;
            const id_user = req.params.id_user;

            const data = await Product.createAnswer(id_review, username ,answer, responseto, id_user);
            console.log(`Status: ${JSON.stringify(data)}`);


                return res.status(201).json({

                success: true,
                message: 'Respuesta  posteada',
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error liKe',
                error: error
            });
        }
    },
 
async deleteLikePost (req, res, next) {
        try {

            const id = req.params.id; 
            const data = await Product.deleteLikePost(id);

            return res.status(201).json({
                message: 'like eliminado',
                success: true
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al eliminar',
                success: false,
                error: error
            });
        }
        
},  
     async createLikePost(req, res, next) {
        try {

            const id_publish = req.params.id_publish; 
            const username = req.params.username;  
            const useremail = req.params.useremail;  
            const id_user = req.params.id_user;  

            const data = await Product.createLikePost(id_publish, username ,useremail, id_user);
        console.log(`Status: ${JSON.stringify(data)}`);


                return res.status(201).json({

                success: true,
                message: 'Like posteado',
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error liKe',
                error: error
            });
        }
    },  



async likePublish(req, res, next) {
        try {

            const id_plate = req.params.id_publish; 
            const username = req.params.username;  
            const useremail = req.params.useremail;  
            const id_user = req.params.id_user;  

            const data = await Product.likePublish(id_publish, username ,useremail, id_user);
        console.log(`Status: ${JSON.stringify(data)}`);


                return res.status(201).json({

                success: true,
                message: 'Like posteado',
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error liKe',
                error: error
            });
        }
    },
 
  async createLike (req, res, next) {
        try {

            const id_plate = req.params.id_plate; 
            const username = req.params.username;  
            const useremail = req.params.useremail;  
            const id_user = req.params.id_user;  

            const data = await Product.createLike(id_plate, username ,useremail, id_user);
        console.log(`Status: ${JSON.stringify(data)}`);


                return res.status(201).json({

                success: true,
                message: 'Like posteado',
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error liKe',
                error: error
            });
        }
    },   

  async createLikeAnswer (req, res, next) {
        try {

            const id_answer = req.params.id_answer; 
            const username = req.params.username;  
            const useremail = req.params.useremail;  
            const id_user = req.params.id_user;  

            const data = await Product.createLikeAnswer(id_answer, username ,useremail, id_user);
        console.log(`Status: ${JSON.stringify(data)}`);


                return res.status(201).json({

                success: true,
                message: 'Like posteado',
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error liKe',
                error: error
            });
        }
    },     
 
 async createComent  (req, res, next) {
        try {

            const comments = req.body;
             console.log(`Status: ${JSON.stringify(comments)}`);


                
            const data = await Product.createComent (comments);
             console.log(`Status: ${JSON.stringify(comments)}`);

                return res.status(201).json({

                success: true,
                message: 'comentario posteado',
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error comentando',
                error: error
            });
        }
    }        
 async createReview (req, res, next) {
        try {

            const comments = req.body;
             console.log(`Status: ${JSON.stringify(comments)}`);


                
            const data = await Product.createReview(comments);
             console.log(`Status: ${JSON.stringify(comments)}`);

                return res.status(201).json({

                success: true,
                message: 'comentario posteado',
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error comentando',
                error: error
            });
        }
    },   

 async createGift (req, res, next) {
        try {

            const gift = req.body;
             console.log(`Status: ${JSON.stringify(gift)}`);


                
            const data = await Product.createGift(gift);
             console.log(`Status: ${JSON.stringify(gift)}`);

                return res.status(201).json({

                success: true,
                message: 'Cierre se realizo correctamente',
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error creado la orden',
                error: error
            });
        }
    },       

}
