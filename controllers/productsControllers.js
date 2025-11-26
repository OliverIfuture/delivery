const Product = require('../models/product');
const storage = require('../utils/cloud_storage.js');
const asyncForEach = require('../utils/async_foreach');

module.exports = {

 async getUserProfile(req, res, next) {
        try {
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
            const data = await Product.deletePost(id);

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
 
  async getTickets(req, res, next) {

        try {
            const userId = req.params.userId;
            const data = await Product.getTickets(userId);
             console.log(`tickets de usuario: ${JSON.stringify(data)}`);

            return res.status(201).json(data);

            
        } catch (error) {
                console.log(`Error: ${error}`);
                return res.status(500).json({
                message: `Error al listar los cupones ${error}`,
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


       async getReviewPlateFavoriteIconProduct(req, res, next) {

        try {
            const id_plate = req.params.id_plate;
            const data = await Product.getReviewPlateFavoriteIconProduct(id_plate);
            console.log(`Status: ${JSON.stringify(data)}`);

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

     async findLikesComent(req, res, next) {
        try {
            const id_post = req.params.id_post;

            const data = await Product.findLikesComent(id_post);
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


     async getAnswersPost (req, res, next) {
        try {
            const id = req.params.id;

            const data = await Product.getAnswersPost (id);
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

  async getAnswersProducts(req, res, next) {
        try {
            const id = req.params.id;

            const data = await Product.getAnswersProducts(id);
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

 async findFavoritesProduct(req, res, next) {
        try {
            const id_plate = req.params.id_plate;
            const id_user = req.params.id_user;     
            const code = await Product.findFavoritesProduct(id_plate, id_user);
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
async findPostComent (req, res, next) {
        try {
            const id = req.params.id;
            const data = await Product.findPostComent(id);
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


async findReviewProduct(req, res, next) {
        try {
            const id = req.params.id;
            const data = await Product.findReviewProduct(id);
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



async setFavoritesProducts(req, res, next) {
        try {

            const id_plate = req.params.id_plate;             
            const id_user = req.params.id_user; 
            const data = await Product.setFavoritesProducts(id_plate, id_user);

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

async deleteFavoritesProducts (req, res, next) {
        try {

            const id_plate = req.params.id_plate;             
            const id_user = req.params.id_user; 
            const data = await Product.deleteFavoritesProducts(id_plate, id_user);

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

async deleteAnswerLikeComent(req, res, next) {
        try {

            const id = req.params.id; 
            const data = await Product.deleteAnswerLikeComent(id);

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

async deleteAnswerLikeProduct (req, res, next) {
        try {

            const id = req.params.id; 
            const data = await Product.deleteAnswerLikeProduct (id);

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
 async deleteLikeCommentPost (req, res, next) {
        try {

            const id = req.params.id; 
            const data = await Product.deleteLikeCommentPost(id);

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

async deleteLikeCommentProduct (req, res, next) {
        try {

            const id = req.params.id; 
            const data = await Product.deleteLikeCommentProduct (id);

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


async updateStockersNewApp (req, res, next) {
        try {

            const id_product = req.params.id_product;             
            const stock = req.params.stock; 
            const id_company = req.params.id_company; 
            console.log(`Nuevo stock: ${id_product} ${stock} ${id_company}`);

            const data = await Product.updateStockersNewApp(id_product, stock, id_company);
            console.log(`Nuevo stock updateStockersNewApp: ${JSON.stringify(data)}`);


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

async favoritesplatesProducts(req, res, next) {
        try {

            const id = req.params.id;    
            const data = await Product.favoritesplatesProducts(id);
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


   async findServings(req, res, next) {
        try {
            const data = await Product.servings();
            console.log(`products : ${JSON.stringify(data)}`);
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

   async getGiftsProducts(req, res, next) {
        try {
            const data = await Product.getGiftsProducts();
            console.log(`products : ${JSON.stringify(data)}`);
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

  async populars(req, res, next) {
        try {
            const data = await Product.populars();
            console.log(`products : ${JSON.stringify(data)}`);
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
            console.log(`products : ${JSON.stringify(data)}`);
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
            const id_company_product = req.params.id_company_product;
            const data = await Product.getAllStocks (id_company, id_company_product);
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
            console.log(`Plato obtenido///////: ${JSON.stringify(data)}`);
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
        const id_category = req.params.id_category;
        const id_company = req.params.id_company;
        const id_product_company = req.params.id_product_company ?? 4; // <= valor por defecto

        const data = await Product.findByCategoryStocks(id_category, id_company, id_product_company);

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

 async findByCategoryStocksNewApp  (req, res, next) {
    try {
        const id_category = req.params.id_category;
        const id_company = req.params.id_company;
        const id_product_company = req.params.id_company; // <= valor por defecto

        const data = await Product.findByCategoryStocksNewApp (id_category, id_company, id_product_company);

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

   async getByCtaegoryAndProductNameSearch(req, res, next) {
        try {
            const product_name = req.params.product_name; // CLIENTE
            const data = await Product.getByCtaegoryAndProductNameSearch(product_name);
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
async findByCategoryAndProductNameStocksNewApp (req, res, next) {
        try {
            const id_category = req.params.id_category; // CLIENTE
            const product_name = req.params.product_name; // CLIENTE
            const id_company = req.params.id_company; // CLIENTE

            const data = await Product.findByCategoryAndProductNameStocksNewApp(id_category, product_name, id_company);
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


 async updateAdminApp(req, res, next) {
        try {
            
            const product = req.body;
            console.log(`Datos enviados del usuario: ${JSON.stringify(product)}`);
            

            await Product.updateAdminApp(product);

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

            const id = req.params.id;

            const data = await Product.delete(id);
            console.log(`Product to delete: ${JSON.stringify(id)}`);


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
          //  console.log(`Datos enviados del usuario: ${JSON.stringify(data)}`);
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

  async setTicket(req, res, next) {
        try {

            const ticketId = req.params.ticketId;
            await Product.setTicket(ticketId);

            return res.status(201).json({
                succes: true,
                message: 'Cupon Activado',

            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: false,
                message: 'Hubo un error al agregar el supon',
                error: error

            });
        }
    }, 
 
  async createAnswerPost (req, res, next) {
        try {

            const id_coment = req.params.id_coment; 
            const username = req.params.username;  
            const answer = req.params.answer;  
            const responseto = req.params.responseto;
            const id_user = req.params.id_user;

            const data = await Product.createAnswerPost(id_coment, username ,answer, responseto, id_user);
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

 async createAnswerProduct(req, res, next) {
        try {

            const id_review = req.params.id_review; 
            const username = req.params.username;  
            const answer = req.params.answer;  
            const responseto = req.params.responseto;
            const id_user = req.params.id_user;

            const data = await Product.createAnswerProduct(id_review, username ,answer, responseto, id_user);
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


  async createLikeComent(req, res, next) {
        try {

            const id_coment = req.params.id_coment; 
            const username = req.params.username;  
            const useremail = req.params.useremail;  
            const id_user = req.params.id_user;  

            const data = await Product.createLikeComent(id_coment, username ,useremail, id_user);
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


async createLikeProduct (req, res, next) {
        try {

            const id_plate = req.params.id_plate; 
            const username = req.params.username;  
            const useremail = req.params.useremail;  
            const id_user = req.params.id_user;  

            const data = await Product.createLikeProduct(id_plate, username ,useremail, id_user);
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

   async createLikeAnswerComent (req, res, next) {
        try {

            const id_answer = req.params.id_answer; 
            const username = req.params.username;  
            const useremail = req.params.useremail;  
            const id_user = req.params.id_user;  

            const data = await Product.createLikeAnswerComent(id_answer, username ,useremail, id_user);
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


  async createLikeAnswerProduct (req, res, next) {
        try {

            const id_answer = req.params.id_answer; 
            const username = req.params.username;  
            const useremail = req.params.useremail;  
            const id_user = req.params.id_user;  

            const data = await Product.createLikeAnswerProduct(id_answer, username ,useremail, id_user);
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
    },    

 async createReviewProduct (req, res, next) {
        try {

            const comments = req.body;
             console.log(`Status: ${JSON.stringify(comments)}`);


                
            const data = await Product.createReviewProduct(comments);
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

  async getExtras(req, res, next) {
        try {
            const id_plate = req.params.id_plate;
            const data = await Product.getExtras(id_plate);
            console.log(`products : ${JSON.stringify(data)}`);
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
 
  async getIngredients(req, res, next) {
        try {
            const id_plate = req.params.id_plate;
            const data = await Product.getIngredients(id_plate);
            console.log(`products : ${JSON.stringify(data)}`);
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



     async createProductDealer(req, res, next) {
        
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

        else if (files.length > 0 && files.length <= 1 ){
            try {

                const data = await Product.createProductDealer(product);//ALMACENANDO VARIOS PRODUCTOS
                product.id = data.id;

                const start = async () => {
                    await asyncForEach(files, async (file) => {
                        const pathImage = `image_${Date.now()}`;
                        const url = await storage(file, pathImage);

                        if (url !== undefined && url !== null) {
                            if (inserts == 0) {//imagen1
                                product.image1 = url;

                            }
                        }

                        await Product.updateProductDealer(product);
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

   async getAlldealers(req, res, next) {
        try {
            const idsucursal = req.params.idsucursal;
            const id_dealer =  req.params.iddealer;
            const data = await Product.getAlldealers(idsucursal, id_dealer);
             console.log(`productos obtenidos: ${JSON.stringify(data)}`);
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


       
   async deleteProductDealer(req, res, next) {
        try {

            const product = req.params;

            const data = await Product.deleteDealer(product.id);
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



    async updateDealerName(req, res, next) {
        try {
            
            const dealerid = req.params.dealerid;
            const name = req.params.name;            

            await Product.updateDealerName(dealerid, name);

            return res.status(201).json({
                succes: true,
                message: 'nombre de dealer editado',

            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: false,
                message: 'Hubo un error con la actualizacion',
                error: error

            });
        }
    },


  async createDealer (req, res, next) {
        try {

            const dealer = req.body;
             console.log(`dealer: ${JSON.stringify(dealer)}`);


                
            const data = await Product.createDealer(dealer);
             console.log(`Status: ${JSON.stringify(dealer)}`);

                return res.status(201).json({

                success: true,
                message: 'maquina registrada correctamente',
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error',
                error: error
            });
        }
    },       

 async deleteRepets (req, res, next) {
        try {

            const idSucursal = req.params.idSucursal;
            const dispense = req.params.dispense;
            const data = await Product.deleteRepets(idSucursal, dispense);

            return res.status(201).json({
                message: 'El producto anterior se elimino correctamente',
                success: true
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al eliminar el producto',
                success: false,
                error: error
            });
        }
        
},

  async selectColors (req, res, next) {
        try {

            const idSucursal = req.params.idSucursal;    
            const data = await Product.selectColors (idSucursal);
             console.log(`Colores obtenidos: ${JSON.stringify(data)}`);
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
  async selectOcations(req, res, next) {
        try {

            const idSucursal = req.params.idSucursal;    
            const data = await Product.selectOcations(idSucursal);
             console.log(`ocaciones obtenidos: ${JSON.stringify(data)}`);
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
  async selectAroma(req, res, next) {
        try {

            const idSucursal = req.params.idSucursal;    
            const data = await Product.selectAroma(idSucursal);
             console.log(`aromas obtenidos: ${JSON.stringify(data)}`);
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


   async selectFlores(req, res, next) {
        try {
            const data = await Product.selectFlores();
            console.log(`flores individuales : ${JSON.stringify(data)}`);
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
   async selectSizes(req, res, next) {
        try {
            const data = await Product.selectSizes();
            console.log(`tamanios individuales : ${JSON.stringify(data)}`);
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

  async createFlavor  (req, res, next) {
        try {

            const flavor = req.body;
             console.log(`Status: ${JSON.stringify(flavor)}`);


                
            const data = await Product.createFlavor (flavor);
             console.log(`Status: ${JSON.stringify(flavor)}`);

                return res.status(201).json({

                success: true,
                message: 'sabor creado',
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error creando el sabor',
                error: error
            });
        }
    },    

  async deleteFlavor (req, res, next) {
        try {

            const id = req.params.id;
            const data = await Product.deleteFlavor(id);

            return res.status(201).json({
                message: 'El sabor se elimino correctamente',
                success: true
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al eliminar el sabor',
                success: false,
                error: error
            });
        }
        
},

 async updateFlavor (req, res, next) {
        try {

            const id = req.params.id;             
            const activate = req.params.activate; 
         
            console.log(`Nuevo stock: ${id} ${activate}`);

            const data = await Product.updateFlavor(id, activate);
            console.log(`Nuevo stock: ${JSON.stringify(data)}`);


                return res.status(201).json({

                success: true,
                message: 'sabor actualizado',
            });
            
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error al actualizar el sabor',
                error: error
            });
        }
    },      

 async getAllServices(req, res, next) {
        try {
            
            const id = req.params.id;
            const data = await Product.getAllServices(id);
             console.log(`Servicios recibidos: ${JSON.stringify(data)}`);
              return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener los servicios'
            });
        }
    },
  async getSchedulesAvailable(req, res, next) {
        try {
            
            const id = req.params.id;
         const day = req.params.day;
            const data = await Product.getSchedulesAvailable(id, day);
             console.log(`getSchedulesAvailable recibidos: ${JSON.stringify(data)}`);
              return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener los servicios'
            });
        }
    },

 async registerAppointment  (req, res, next) {
        try {

            const appointment = req.body;
            const data = await Product.registerAppointment (appointment);
             console.log(`appointments: ${JSON.stringify(appointment)}`);

                return res.status(201).json({
                success: true,
                message: 'cita creada con exito',
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                success: false,
                message: 'Hubo un error creando la cita',
                error: error
            });
        }
    },     


   async selectAppoimentHour (req, res, next) {
        try {

            const id = req.params.id;    
         const startdatetime = req.params.startdatetime;
            const data = await Product.selectAppoimentHour (id, startdatetime);
             console.log(`selectAppoimentHour obtenidos: ${JSON.stringify(data)}`);
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


   async getCompanyByUser(req, res, next) {
        try {
            const id = req.params.id;
            const data = await Product.getCompanyByUser(id);
             console.log(`compamy obtenidos: ${JSON.stringify(data)}`);
            return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener el negocio'
            });
        }
    },

async createServiceWithSchedule(req, res, next) {
    try {
        // req.body es el objeto completo que enviaste desde Flutter.
        // Contiene las llaves 'service' y 'schedules'.

        // 1. Extraemos el objeto del servicio
        const service = req.body.service;
        
        // 2. Extraemos el array de horarios
        const schedules = req.body.schedules;

        console.log(`Servicio recibido: ${JSON.stringify(service)}`);
        console.log(`Horarios recibidos: ${JSON.stringify(schedules)}`);

        // --- Lógica para guardar en la Base de Datos ---

        // 3. Primero, insertas el servicio para obtener su ID.
        //    (Asegúrate que tu función `createService` devuelva el objeto creado con su ID).
        const data = await Product.createService(service);
        const newServiceId = data.service_id; 

        // 4. Luego, recorres el array de horarios y los insertas uno por uno,
        //    asociándolos con el ID del servicio que acabas de crear.
        for (const schedule of schedules) {
            // A cada objeto de horario le asignas el ID del servicio recién creado.
            schedule.service_id = newServiceId; 
            await Product.createSchedule(schedule); // Asumiendo que tienes una función para crear horarios.
        }

        return res.status(201).json({
            success: true,
            message: 'Servicio y horarios registrados correctamente',
        });
        
    } catch (error) {
        console.log(`Error: ${error}`);
        return res.status(501).json({
            success: false,
            message: 'Hubo un error al registrar el servicio con sus horarios',
            error: error
        });
    }
},  
 
  async getAllServicesNotTrueOnly(req, res, next) {
        try {
            
            const id = req.params.id;
            const data = await Product.getAllServicesNotTrueOnly(id);
             console.log(`Servicios recibidos getAllServicesNotTrueOnly: ${JSON.stringify(data)}`);
              return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                succes: false,
                message: 'error al obtener los servicios'
            });
        }
    },

        async updateService(req, res, next) {
        try {
            
            const services = req.body;
            console.log(`Datos enviados del usuario: ${JSON.stringify(services)}`);
            

            await Product.updateService(services);

            return res.status(201).json({
                succes: true,
                message: 'servicio actualizado correctamente',

            });

        }

        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({

                succes: false,
                message: 'Hubo un error con la actualizacion de services',
                error: error

            });
        }
    }, 

  async deleteService (req, res, next) {
        try {

            const id = req.params.id;
            const data = await Product.deleteService(id);

            return res.status(201).json({
                message: 'servicio eliminado correctamente',
                success: true
            });
            
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                message: 'Hubo un error al eliminar el servicio',
                success: false,
                error: error
            });
        }
        
},

       async getByCompany(req, res, next) {
        try {
            const id = req.params.id;
            const data = await Product.getByCompany(id);
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

    async getAllForAffiliates(req, res, next) {
        try {
            const data = await Product.getAllForAffiliates();
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en productsController.getAllForAffiliates: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener los productos del marketplace de afiliados',
                error: error.message
            });
        }
    },

 async findById(req, res, next) {
        try {
            const id_product = req.params.id;
            const data = await Product.findById(id_product);
            
            if (!data) {
                return res.status(404).json({ success: false, message: 'Producto no encontrado' });
            }
            
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en productsController.findById: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener el producto',
                error: error.message
            });
        }
    },

  async getAllServicesGym(req, res, next) {
        try {
            
            const id = req.params.id;
            const data = await Product.getAllServicesGym(id);
             console.log(`Planes de gym recibidos: ${JSON.stringify(data)}`);
              return res.status(201).json(data);


        }
        catch (error) {
            
            console.log(`error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'error al obtener los planes'
            });
        }
    },
 
}
