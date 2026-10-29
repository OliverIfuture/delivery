// controllers/casaformaUserPackagesController.js
const CasaformaUserPackage = require('../models/casaformaUserPackage');

module.exports = {
    async getActive(req, res) {
        try {
            const list = await CasaformaUserPackage.getActiveByUser(req.params.userId);
            return res.status(200).json({ success: true, message: 'OK', data: list });
        } catch (error) {
            console.log('Error casaforma user-packages.getActive:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener los paquetes del cliente.', error: error.message });
        }
    }
};
