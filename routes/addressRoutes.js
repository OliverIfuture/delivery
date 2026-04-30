const passport = require('passport');
const addressController = require('../controllers/addressController');
const addressControllers = require('../controllers/addressController');
const { findByUser } = require('../models/addres');

module.exports = (app) => {

    /* 
*GET ROUTES
*/
    app.get('/api/address/findByUser/:id_user', passport.authenticate('jwt', { session: false }), addressController.findByUser);
    app.get('/api/address/findPromoByGym/:id_company', passport.authenticate('dealer-jwt', { session: false }), addressController.findPromoByGym);

    /* 
    *POST ROUTES
   */
    app.post('/api/address/create', passport.authenticate('jwt', { session: false }), addressControllers.create);


    app.delete('/api/address/delete/:id/:id_user', passport.authenticate('jwt', { session: false }), addressControllers.delete);

    //////////// COBI ////////////////
    // Obtener todas las sucursales de una empresa en específico
    app.get('/api/locations/findByCompany/:company_id', passport.authenticate('cobi-jwt', { session: false }), addressControllers.findByCompany);

    /* * POST ROUTES
     */
    // Crear una nueva sucursal/ubicación
    app.post('/api/locations/create', passport.authenticate('cobi-jwt', { session: false }), addressControllers.cobicreate);

    /* * PUT ROUTES
     */
    // Marcar una ubicación como la predeterminada (Usa PUT porque estamos actualizando un estado)
    app.put('/api/locations/setDefault', passport.authenticate('cobi-jwt', { session: false }), addressControllers.setDefault);


    // Obtener todas las preferencias de una empresa (Matriz y Sucursales)
    app.get('/api/locations/findByCompanyPref/:id_company', passport.authenticate('cobi-jwt', { session: false }), addressControllers.findByCompanyPref);

    /*
    * POST ROUTES
    */
    // Guardar o actualizar las preferencias de una sucursal específica (UPSERT)
    app.post('/api/locations/upsert', passport.authenticate('cobi-jwt', { session: false }), addressControllers.upsert);

    // 🔥 NUEVA: Ruta para actualizar todos los datos de la sucursal
    app.put('/api/locations/update', passport.authenticate('cobi-jwt', { session: false }), addressControllers.update);

    /*
    * DELETE ROUTES (Eliminaciones)
    */
    // 🔥 NUEVA: Ruta para eliminar. Usamos :id para pasarlo directamente en la URL
    app.delete('/api/locations/delete/:id', passport.authenticate('cobi-jwt', { session: false }), addressControllers.cobidelete);



    //////////// 🔥 UBER DIRECT / COBI PAY ////////////////

    // Nota: Esta ruta es pública porque la usa el cliente final en Vue.js
    app.post('/api/delivery/quote', async (req, res) => {
        try {
            const {
                merchantLat,
                merchantLng,
                customerLat,
                customerLng,
                merchantFeePercentage,
                customerAddressText // 🔥 Atrapamos el texto de Google Autocomplete
            } = req.body;

            // Validación rápida de datos
            if (!merchantLat || !customerLat || !customerAddressText) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan coordenadas o la dirección en texto.'
                });
            }

            // 1. Llamamos a Uber para el precio real
            const uberQuote = await addressController.getQuote(
                { lat: merchantLat, lng: merchantLng },
                { lat: customerLat, lng: customerLng, addressText: customerAddressText } // Pasamos el texto
            );

            // 2. Convertimos centavos a pesos
            const totalFee = uberQuote.fee / 100;

            // 3. Aplicamos la lógica de COBI (Split de pago)
            const merchantPart = totalFee * (merchantFeePercentage / 100);
            const customerPart = totalFee - merchantPart;

            return res.status(200).json({
                success: true,
                quote_id: uberQuote.id,
                total_fee: totalFee,
                merchant_pays: merchantPart,
                customer_pays: customerPart,
                currency: uberQuote.currency_type,
                estimated_arrival: uberQuote.dropoff_eta
            });

        } catch (error) {
            // Manejo específico del error de distancia de Uber (Sandbox)
            if (error.response && error.response.data && error.response.data.code === 'address_undeliverable') {
                return res.status(400).json({
                    success: false,
                    message: 'El destino se encuentra fuera de nuestra área de cobertura actual.',
                    details: error.response.data.metadata.details
                });
            }

            console.error('Error en /api/delivery/quote:', error);
            return res.status(500).json({
                success: false,
                message: 'No pudimos cotizar el envío. Verifica las coordenadas o el estado de Uber Direct.'
            });
        }
    });

}
