var amqp = require('amqplib/callback_api');
//var connectionString = 'amqp://user:bitnami@haproxy:5672'; 
var connectionString = 'amqp://user:bitnami@192.168.91.3:5672';

//Get the hostname of the node
var os = require("os");
var myhostname = os.hostname(); // Note: This may become the NodeID
// var nodeNameFileChecked = false;
var defineAddr;

const fs = require('fs');
nodesJsonFile = fs.readFileSync('nodes.json');
nodes = JSON.parse(nodesJsonFile);

// Gets the IP address of the node
var ipaddr = require('dns').lookup(require('os').hostname(), function (err, add, fam) {
  console.log('Success - the addr: ' + add);
  defineAddr = add;
})



// Create or append a file with the node names
// function AddNodeToFile(nodeName) {
//   fs.appendFile('nodeNames.txt', nodeName, function (err) {
//     if (err) throw err;
//     console.log('nodeNames added to the file');
//   });
// }

// Check if the node name exists
// if(!nodeNameFileChecked) {
//   fs.access('nodeNames.txt', (err) => {
//     if (err) {
//         console.log("The 'nodeNames.txt' file does not exist.");
//         AddNodeToFile("");
//         console.log("An empty 'nodeNames.txt' file has now been created.");
//         nodeNameFileChecked = true;
//     } else {
//         console.log("The file already exists.");
//         nodeNameFileChecked = true;
//     }
// });
// } else {
//   AddNodeToFile({hName: hostname, addr: ipaddr});
// }

amqp.connect(connectionString, function(error0, connection) {});

// Publish
amqp.connect(connectionString, function(error0, connection) {
      if (error0) {
              throw error0;
            }
      console.log("we have a connection using: " + connectionString + "for " + myhostname)
      connection.createChannel(function(error1, channel) {});
});

  amqp.connect(connectionString, function(error0, connection) {

    if (error0) {
            throw error0;
          }
          setInterval(function() {
          connection.createChannel(function(error1, channel) {
                  if (error1) {
                            throw error1;
                          }
                  var exchange = 'logs';
                  var msg =  '{ ' + myhostname + ' }" : "{ ' + ipaddr + ' }"';
    
                  channel.assertExchange(exchange, 'fanout', {
                            durable: false
                          });
                  channel.publish(exchange, '', Buffer.from(msg));
                  console.log(" [x] Sent %s", msg);
                });
                
        setTimeout(function() {
                  }, 500);
        }, 1000)
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
