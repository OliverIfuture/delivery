var conekta = require('conekta');
conekta.api_key = 'key_eYvWV7gSDkNYXsmr';
conekta.api_version = '2.0.0';


customer = conekta.Customer.create({
    "name": "Fulanito",
    "email": "fulanito@test.com",
    "phone": "+5218181818181",
    "payment_method": {
      "type": "oxxo_recurrent"
    }
}, function(err, res) {
    console.log(res.toObject());
});
