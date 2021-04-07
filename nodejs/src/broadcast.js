var amqp = require('amqplib/callback_api');
//var connectionString = 'amqp://user:bitnami@RabbitMQ-LB:5672'; // OLD connection string
var connectionString = 'amqp://user:bitnami@192.168.91.3:5672';

amqp.connect(connectionString, function(error0, connection) {});

// Publish
amqp.connect(connectionString, function(error0, connection) {
      if (error0) {
              throw error0;
            }
      console.log("we have a connection using: " + connectionString)
      connection.createChannel(function(error1, channel) {});
});

amqp.connect(connectionString, function(error0, connection) {

if (error0) {
        throw error0;
      }
      connection.createChannel(function(error1, channel) {
              if (error1) {
                        throw error1;
                      }
              var exchange = 'logs';
              var msg =  'Hello World!';

              channel.assertExchange(exchange, 'fanout', {
                        durable: false
                      });
              channel.publish(exchange, '', Buffer.from(msg));
              console.log(" [x] Sent %s", msg);
            });
            
    setTimeout(function() {
              }, 500);
});

// Subscribe
amqp.connect(connectionString, function(error0, connection) {
      if (error0) {
              throw error0;
            }
      connection.createChannel(function(error1, channel) {
              if (error1) {
                        throw error1;
                      }
              var exchange = 'logs';

              channel.assertExchange(exchange, 'fanout', {
                        durable: false
                      });

              channel.assertQueue('', {
                        exclusive: true
                      }, function(error2, q) {
                                if (error2) {
                                            throw error2;
                                          }
                                console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
                                channel.bindQueue(q.queue, exchange, '');

                                channel.consume(q.queue, function(msg) {
                                            if(msg.content) {
                                                            console.log(" [x] %s", msg.content.toString());
                                                          }
                                          }, {
                                                      noAck: true
                                                    });
                              });
            });
});
