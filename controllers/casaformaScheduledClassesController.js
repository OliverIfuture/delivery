// controllers/casaformaScheduledClassesController.js
const CasaformaScheduledClass = require('../models/casaformaScheduledClass');
const CasaformaReservation = require('../models/casaformaReservation');

module.exports = {
    async getAll(req, res) {
        try {
            const classes = await CasaformaScheduledClass.getAll();
            return res.status(200).json({ success: true, message: 'OK', data: classes });
        } catch (error) {
            console.log('Error casaforma scheduled-classes.getAll:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener las clases agendadas.', error: error.message });
        }
    },

    async create(req, res) {
        try {
            const item = await CasaformaScheduledClass.create(req.body);
            return res.status(201).json({ success: true, message: 'Clase agendada.', data: item });
        } catch (error) {
            console.log('Error casaforma scheduled-classes.create:', error);
            return res.status(500).json({ success: false, message: 'Error al agendar la clase.', error: error.message });
        }
    },

    // Cancela la clase Y todas sus reservaciones, regresando el crédito
    // de las que sí lo descontaron (sin ventana de horas — la cancela el
    // club, no el cliente). Ver CasaformaReservation.cancelClassWithRefunds.
    async cancel(req, res) {
        try {
            const result = await CasaformaReservation.cancelClassWithRefunds(req.params.id);
            if (!result) {
                return res.status(404).json({ success: false, message: 'Clase no encontrada.' });
            }
            const item = await CasaformaScheduledClass.getById(req.params.id);
            return res.status(200).json({
                success: true,
                message: `Clase cancelada. ${result.cancelledReservations} reservación(es) cancelada(s), ${result.refundedCount} crédito(s) devuelto(s).`,
                data: item
            });
        } catch (error) {
            console.log('Error casaforma scheduled-classes.cancel:', error);
            return res.status(500).json({ success: false, message: 'Error al cancelar la clase.', error: error.message });
        }
    }
};
