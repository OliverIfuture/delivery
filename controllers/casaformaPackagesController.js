// controllers/casaformaPackagesController.js
const CasaformaPackage = require('../models/casaformaPackage');

module.exports = {
    async getAll(req, res) {
        try {
            const packages = await CasaformaPackage.getAll();
            return res.status(200).json({ success: true, message: 'OK', data: packages });
        } catch (error) {
            console.log('Error casaforma packages.getAll:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener los paquetes.', error: error.message });
        }
    },

    async create(req, res) {
        try {
            const pkg = await CasaformaPackage.create(req.body);
            return res.status(201).json({ success: true, message: 'Paquete creado.', data: pkg });
        } catch (error) {
            console.log('Error casaforma packages.create:', error);
            return res.status(500).json({ success: false, message: 'Error al crear el paquete.', error: error.message });
        }
    },

    async update(req, res) {
        try {
            const pkg = await CasaformaPackage.update(req.params.id, req.body);
            if (!pkg) {
                return res.status(404).json({ success: false, message: 'Paquete no encontrado.' });
            }
            return res.status(200).json({ success: true, message: 'Paquete actualizado.', data: pkg });
        } catch (error) {
            console.log('Error casaforma packages.update:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar el paquete.', error: error.message });
        }
    },

    async deletePackage(req, res) {
        try {
            const deactivated = await CasaformaPackage.deactivate(req.params.id);
            if (!deactivated) {
                return res.status(404).json({ success: false, message: 'Paquete no encontrado.' });
            }
            return res.status(200).json({ success: true, message: 'Paquete eliminado.' });
        } catch (error) {
            console.log('Error casaforma packages.delete:', error);
            return res.status(500).json({ success: false, message: 'Error al eliminar el paquete.', error: error.message });
        }
    }
};
