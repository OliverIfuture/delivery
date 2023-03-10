const express = require('express');
const app = express();

const http = require('http');
const server = http.createServer(app);
const logger = require('morgan');
const cors = require('cors');
const multer = require('multer');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const password = require('passport');
const io = require('socket.io')(server);
const mercadopago = require('mercadopago');
/*
* mercadopago config
*/
mercadopago.configure({
    access_token: 'TEST-3489130875095219-030320-0f0a92e8a429cb7ebc0c9d4e1f89cf6f-372923193'

});



/*
* SOCKETS
*/
const orderDeliverySocket = require('./sockets/orders_delivery_socket');

/*
/**
 * * iniciar firebase admin
 *  
 * */
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)

})

const upload = multer({
    storage: multer.memoryStorage()
})

/**
 * * RUTAS 
 * */
const users = require('./routes/usersRoutes.js');
const categories = require('./routes/categoriesRoutes');
const passport = require('passport');
const products = require('./routes/productsRoutes');
const address = require('./routes/addressRoutes');
const orders = require('./routes/ordersRoutes');
const mercadoPagoRoutes = require('./routes/mercadoPagoRoutes');
const PORT = process.env.PORT || 4000




app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
app.use(cors());
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);
app.disable('x-power-by');
app.set('PORT', PORT);
    


// LLAMAR A LOS SOCKETS
orderDeliverySocket(io);
/**
 * *LLAMANDO RUTAS 
 * */
users(app, upload);
categories(app);
products(app, upload);
address(app, upload);
orders(app);
mercadoPagoRoutes(app);



server.listen(PORT, function () {
    console.log('Aplicacion de NodeJs ' + process.pid + ' iniciada... : puerto asignado ' + PORT);
});    



//ERROR HANDLER

app.use((err, req, res, next) => {
    console.log(err);
    res.status(err.status || 500).send(err.stack);
});
    
module.exports = {
    app: app,
    server: server
}

