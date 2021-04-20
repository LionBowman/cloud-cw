var amqp = require('amqplib/callback_api');
//var connectionString = 'amqp://user:bitnami@haproxy:5672'; 
var connectionString = 'amqp://user:bitnami@192.168.91.3:5672';

// Get the hostname of the node
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

// Initialise not as the leader
var systemLeader = 0;

// Empty array
var nodeArr = [];

var nodeID = Math.floor(Math.random() * (100 - 1 + 1) + 1);
//toSend = {"hostname" : myhostname, "status": "alive","nodeID":nodeID} ;

// Check if leader
function LeaderElection () {
  console.log(nodeArr);
  var thisNode = getNode();
  leader = 1;
  activeNodes = 0;
  nodeArr.forEach((node) => {
    console.log("test " , node)
    if (node.hostname != thisNode.hostname) {
        activeNodes++;
        if (node.id > thisNode.id) {
          leader = 0;
          console.log("I'm NOT the leader, it is now", node.hostname, " with ", node.id)
        }
      //}
    }
    if ((leader == 1) && (activeNodes == (nodeArr.length - 1))) {
      systemLeader = 1;
      console.log("I'm the leader")
    } else {
      systemLeader = 0;
      console.log("I'm NOT the leader, it is now", node.hostname, " with ", node.id)
    }
  });
  console.log("-------------")
  console.log("System Leader = ", systemLeader)
  // console.log("Active Nodes = ", activeNodes)
  // console.log("Node Array Length (-1) = ", (nodeArr.length - 1))
  console.log("-------------")
};

function getNode () {
  const node = {
    id: nodeID,
    hostname: os.hostname()
  };

  return node
}

function AddToArray(nodeToAdd) {
  if(nodeArr.some(node => node.id == nodeToAdd.id))
    return;
  nodeArr.push(nodeToAdd);
}

amqp.connect(connectionString, function (error0, connection) { });

// Publish
amqp.connect(connectionString, function (error0, connection) {
  if (error0) {
    throw error0;
  }
  console.log("we have a connection using: " + connectionString + "for " + myhostname)
  connection.createChannel(function (error1, channel) { });
});

amqp.connect(connectionString, function (error0, connection) {

  if (error0) {
    throw error0;
  }
  setInterval(function () {
    connection.createChannel(function (error1, channel) {
      if (error1) {
        throw error1;
      }
      var exchange = 'logs';
      var msg = JSON.stringify(getNode());

      channel.assertExchange(exchange, 'fanout', {
        durable: false
      });
      channel.publish(exchange, '', Buffer.from(msg));
      console.log(" [x] Sent %s", msg);
    });

    setTimeout(function () {
    }, 500);
  }, 1000)
});

// Subscribe
amqp.connect(connectionString, function (error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function (error1, channel) {
    if (error1) {
      throw error1;
    }
    var exchange = 'logs';

    channel.assertExchange(exchange, 'fanout', {
      durable: false
    });

    channel.assertQueue('', {
      exclusive: true
    }, function (error2, q) {
      if (error2) {
        throw error2;
      }
      console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
      channel.bindQueue(q.queue, exchange, '');

      channel.consume(q.queue, function (msg) {
        if (msg.content) {
          console.log(" [x] Received %s", msg.content.toString());
          AddToArray(JSON.parse(msg.content.toString()));
          LeaderElection();
        }
      }, {
        noAck: true
      });
    });
  });
});
