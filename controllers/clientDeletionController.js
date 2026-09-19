// controllers/clientDeletionController.js
//
// NUEVO — "Eliminar cliente" real desde el panel del entrenador (Vue). Ver
// el detalle completo (y por qué se hace en dos pasos) en
// models/clientDeletion.js.
const ClientDeletion = require('../models/clientDeletion.js');

module.exports = {

    async deleteClient(req, res) {
        try {
            const id_client = req.params.id_client;
            const id_company = req.user.mi_store;

            const client = await ClientDeletion.belongsToTrainer(id_client, id_company);
            if (!client) {
                return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
            }

            // 1. Siempre se limpia todo lo que es del panel de entrenador.
            await ClientDeletion.purgeTrainerData(id_client, client.email);

            // 2. Solo se borra la cuenta completa si no hay actividad real
            //    en otro producto de esta misma base de datos compartida.
            const crossProductActivity = await ClientDeletion.getCrossProductActivity(id_client);

            if (crossProductActivity.length > 0) {
                await ClientDeletion.detachFromTrainer(id_client);
                return res.status(200).json({
                    success: true,
                    accountDeleted: false,
                    message: `Se borraron todos sus datos de entrenamiento y se desvinculó de tu lista. Su cuenta NO se eliminó por completo porque tiene actividad en otro producto: ${crossProductActivity.join(', ')}.`
                });
            }

            await ClientDeletion.deleteAccount(id_client);
            return res.status(200).json({
                success: true,
                accountDeleted: true,
                message: 'Cliente y su cuenta eliminados por completo.'
            });

        } catch (error) {
            console.log(`Error en clientDeletionController.deleteClient: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al eliminar al cliente',
                error: error.message
            });
        }
    }

};
