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
//const io = require('socket.io')(server);
// Configuración CORS específica para WebSockets
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
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
const orderDeliverySocket = require('./sockets/orders_delivery_socket.js');

/*
/**
 * * iniciar firebase admin
 * * */
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
const categories = require('./routes/categoriesRoutes.js');
const passport = require('passport');
const products = require('./routes/productsRoutes.js');
const address = require('./routes/addressRoutes.js');
const orders = require('./routes/ordersRoutes.js');
const mercadoPagoRoutes = require('./routes/mercadoPagoRoutes.js');
const exercises = require('./routes/exercisesRoutes.js');
const routines = require('./routes/routinesRoutes.js'); // **NUEVA RUTA AÑADIDA**
const diets = require('./routes/dietsRoutes.js');
const workoutLogs = require('./routes/workoutLogsRoutes.js');
const subscriptionPlans = require('./routes/subscriptionPlansRoutes.js');
const clientSubscriptions = require('./routes/clientSubscriptionsRoutes.js'); // <-- AÑADE ESTA
const stripeConnect = require('./routes/stripeConnectRoutes.js');
const clientProgress = require('./routes/clientProgressRoutes.js');
const chat = require('./routes/chatRoutes.js');
const trainerDashboard = require('./routes/trainerDashboardRoutes.js');
const superAdmin = require('./routes/superAdminRoutes.js');
const affiliateRoutes = require('./routes/affiliateRoutes.js');
const gymRoutes = require('./routes/gymRoutes.js');
const posRoutes = require('./routes/posRoutes.js');
const gymAdminRoutes = require('./routes/gymAdminRoutes.js');
const nutritionRoutes = require('./routes/nutritionRoutes.js');
const walletRoutes = require('./routes/walletRoutes.js');

const PORT = process.env.PORT || 4000




app.use(logger('dev'));
// Usamos express.json() CON la opción "verify"
app.use(express.json({
    verify: (req, res, buf) => {
        // Guardamos el body "crudo" (raw) en una nueva variable
        // para que el webhook de Stripe pueda usarlo
        req.rawBody = buf;
    }
}));

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true
}));
app.use(express.urlencoded({
    extended: true
}));
//app.use(cors());
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport.js')(passport);
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
exercises(app, upload);
routines(app); // **NUEVA RUTA AÑADIDA**
diets(app);
workoutLogs(app);
subscriptionPlans(app);
clientSubscriptions(app);
stripeConnect(app); // <-- AÑADE ESTA LÍNEA
clientProgress(app);
chat(app, upload);
trainerDashboard(app);
superAdmin(app);
affiliateRoutes(app);
gymRoutes(app);
posRoutes(app);
gymAdminRoutes(app);
nutritionRoutes(app);
walletRoutes(app, upload);

// IMPORTANTE: '0.0.0.0' hace que el servidor escuche conexiones externas
server.listen(PORT, '0.0.0.0', function () {
    console.log('🚀 Servidor escuchando en puerto: ' + PORT);
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

