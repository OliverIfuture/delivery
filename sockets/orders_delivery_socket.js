module.exports = (io) => {
  const orderDeliveryNamespace = io.of('/orders/delivery');

  orderDeliveryNamespace.on('connection', function(socket) {
    console.log('USUARIO CONECTADO AL NAMESPACE /orders/delivery');
    socket.emit('welcome', { message: 'Bienvenido!' });

    socket.on('position', function(data) {
      console.log(`EMITIO ${JSON.stringify(data)}`);
      orderDeliveryNamespace.emit(`position/${data.id_order}`, { lat: data.lat, lng: data.lng });
    });

    socket.on('dealer_on', function(data) {
      console.log('machine dealer ON', data);
      console.log('Emitiendo evento dealer_on_dealer_1...');
      orderDeliveryNamespace.emit('dealer_on_/${data.machine}', { id_product: data.id_product, msg: data.msg });
      console.log('Evento dealer_on_dealer_1 emitido');
    });


    socket.on('dealer_off', function(data) {
      console.log('machine dealer OFF recibido:', data);
      console.log(`machine dealer OFF ${JSON.stringify(data)}`);
      orderDeliveryNamespace.emit(`dealer_off/${data.machine}`, { id_product: data.id_product, msg: data.msg });
    });

    socket.on('disconnect', function(data) {
      console.log('USUARIO DESCONECTADO');
    });
  });
}
