module.exports = (io) => {

    const orderDeliveryNamespace = io.of('/orders/delivery');
    orderDeliveryNamespace.on('connection', function(socket) {

        console.log('USUARIO CONECTADO AL NAMESPACE /orders/delivery');

        socket.on('position', function(data) {
            console.log(`EMITIO ${JSON.stringify(data)}`);
            orderDeliveryNamespace.emit(`position/${data.id_order}`, { lat: data.lat, lng: data.lng  });
        });


        
        socket.on('dealer_on', function(data) {
          console.log(`machine dealer ${JSON.stringify(data)}`);
          setTimeout(() => {
            orderDeliveryNamespace.emit(`dealer_on/${data.machine}`, { 
              id_product: data.id_product, 
              msg: data.msg 
            });
          }, 3000); // Retraso de 3 segundos (3000 milisegundos)
        });

        socket.on('dealer_off', function(data) {
          console.log(`machine dealer ${JSON.stringify(data)}`);
          setTimeout(() => {
            orderDeliveryNamespace.emit(`dealer_on/${data.machine}`, { 
              id_product: data.id_product, 
              msg: data.msg 
            });
          }, 3000); // Retraso de 3 segundos (3000 milisegundos)
        });



        socket.on('disconnect', function(data) {
            console.log('USUARIO DESCONECTADO');
        });
    });

}
