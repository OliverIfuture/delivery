// controllers/selfClientController.js
//
// NUEVO — ver models/selfClient.js.
const SelfClient = require('../models/selfClient.js');

module.exports = {
    async ensureMine(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            const row = await SelfClient.ensure(id_company);
            return res.status(200).json({ success: true, data: row });
        } catch (error) {
            console.log(`Error en selfClientController.ensureMine: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al preparar tu cuenta como cliente' });
        }
    }
};
