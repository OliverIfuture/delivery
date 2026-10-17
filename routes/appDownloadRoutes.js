const appDownloadController = require('../controllers/appDownloadController.js');

module.exports = (app) => {

    // PÚBLICO — es el destino del QR "Descarga la app" del panel, lo abre
    // el celular del cliente sin ninguna sesión todavía.
    app.get('/app-download', appDownloadController.redirectToStore);

};
