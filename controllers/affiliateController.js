const Affiliate = require('../models/affiliate.js');

module.exports = {

    /**
     * Obtiene el historial de comisiones para el entrenador logueado
     */
    async getMyCommissions(req, res, next) {
        try {
            // El ID del entrenador (afiliado) viene del token
            const id_company_affiliate = req.user.mi_store;

            if (!id_company_affiliate) {
                 return res.status(400).json({ success: false, message: 'El usuario no es un afiliado (no tiene compañía).'});
            }

            const data = await Affiliate.getCommissionsByAffiliate(id_company_affiliate);
            
            return res.status(200).json(data);

        } catch (error) {
            console.log(`Error en affiliateController.getMyCommissions: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener las comisiones',
                error: error.message
            });
        }
    },

};
