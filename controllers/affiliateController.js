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

        /**
     * **NUEVA FUNCIÓN: (Paso 15.8a)**
     * Obtiene el dashboard de pagos pendientes para la Tienda (Vendedor) logueada.
     */
    async getMyVendorDashboard(req, res, next) {
        try {
            const id_company_vendor = req.user.mi_store;

            if (!id_company_vendor) {
                 return res.status(400).json({ success: false, message: 'El usuario no es un vendedor.'});
            }

            const data = await Affiliate.getPendingPayoutsByVendor(id_company_vendor);
            return res.status(200).json(data);

        } catch (error) {
            console.log(`Error en affiliateController.getMyVendorDashboard: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener el dashboard de pagos',
                error: error.message
            });
        }
    },

    /**
     * **NUEVA FUNCIÓN: (Paso 15.8a)**
     * La Tienda (Vendedor) marca las comisiones de un Entrenador como pagadas.
     */
    async markCommissionsAsPaid(req, res, next) {
        try {
            const id_company_vendor = req.user.mi_store;
            const { id_affiliate } = req.body; // El ID del Entrenador al que le pagó

            if (!id_company_vendor) {
                 return res.status(400).json({ success: false, message: 'El usuario no es un vendedor.'});
            }
            if (!id_affiliate) {
                return res.status(400).json({ success: false, message: 'Falta el ID del afiliado (entrenador).'});
            }

            await Affiliate.markAsPaid(id_company_vendor, id_affiliate);
            
            return res.status(200).json({
                success: true,
                message: 'Comisiones marcadas como pagadas.'
            });

        } catch (error) {
            console.log(`Error en affiliateController.markCommissionsAsPaid: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al marcar comisiones como pagadas',
                error: error.message
            });
        }
    },

};
