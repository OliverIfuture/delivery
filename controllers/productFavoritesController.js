// controllers/productFavoritesController.js
const ProductFavorite = require('../models/productFavorite');

module.exports = {
    async getMine(req, res) {
        try {
            const data = await ProductFavorite.getByUser(req.user.id);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.log(`Error en productFavoritesController.getMine: ${error}`);
            return res.status(500).json({ success: false, message: 'No se pudieron obtener tus favoritos.' });
        }
    },

    async toggle(req, res) {
        try {
            const { id_product } = req.body;
            if (!id_product) {
                return res.status(400).json({ success: false, message: 'Falta id_product.' });
            }
            const result = await ProductFavorite.toggle(req.user.id, id_product);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.log(`Error en productFavoritesController.toggle: ${error}`);
            return res.status(500).json({ success: false, message: 'No se pudo actualizar tus favoritos.' });
        }
    }
};
