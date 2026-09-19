const clientDeletionController = require('../controllers/clientDeletionController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/users — "Eliminar cliente" real desde el panel del
    // entrenador. Ver models/clientDeletion.js para el detalle de qué
    // borra y por qué a veces no borra la cuenta completa.
    app.delete('/api/users/deleteClient/:id_client', passport.authenticate('jwt', { session: false }), clientDeletionController.deleteClient);

};
