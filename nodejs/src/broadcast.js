var amqp = require('amqplib/callback_api');
var connectionString = 'amqp://user:bitnami@192.168.91.3:5672';

// Get the hostname of the node
var os = require("os");
var myhostname = os.hostname(); // Note: This may become the NodeID
// var nodeNameFileChecked = false;
// IP Address variable
var defineAddr;

// Gets the IP address of the node
var ipaddr = require('dns').lookup(require('os').hostname(), function (err, add, fam) {
  console.log('Success - the addr: ' + add);
  defineAddr = add;
})

// Import the request library
var request = require('request');

// Initialise not as the leader
var systemLeader = 0;
// Initial number of containers (on startup)
const minNodeCount = 3;
// Initial ID number for newly created nodes
var newNodeStartId = 1;
// Time variable for the last created node (additional to the starting nodes)
var lastNewNodeCreationTime; 
// Initial Empty node array
var nodeArr = [];
// Timeout for dead node pruning
const pruneTimeout = 30000;
// Sets the node ID based on .. (ToDo: need to change to use date/time number as the ID)
var nodeID = Math.floor(Math.random() * (100 - 1 + 1) + 1);
//toSend = {"hostname" : myhostname, "status": "alive","nodeID":nodeID} ;

// Removes dead nodes from the node array list
function pruneDeadNodes() {
  console.log('CALLED: prune dead nodes'); // Debug
  var newNodeArr = [];
  nodeArr.forEach((node) => {
    if(node.lastAliveTime <= Date.now() - pruneTimeout)
      return;
    newNodeArr.push(node);
  })
  nodeArr = newNodeArr;
}

// Creates new nodes using the Docker API
async function createNewNode() {
  console.log('CALLED: create new node'); // Debug
  const createData = {
    Image: 'cloud-cw_node1',
    Hostname: 'newNode' + newNodeStartId,
  };

var url = connectionString;

// POST request to the Docker API for creating a new node
var create = {
  uri: url + "/v1.40/containers/create",
  method: 'POST',
  //deploy an container based on the createData params
  json: createData
};

// Container create request
request(create, function (error, response, createBody) {
  if (!error) {
    console.log("Created container " + JSON.stringify(createBody));
   
      // POST request for container start
      var start = {
          uri: url + "/v1.40/containers/" + createBody.Id + "/start",
        method: 'POST',
        json: {}
    };
  
    // Container start request
      request(start, function (error, response, startBody) {
        if (!error) {
          console.log("Container start completed");
    
              // POST request for container wait
              var wait = {
            uri: url + "/v1.40/containers/" + createBody.Id + "/wait",
                  method: 'POST',
              json: {}
          };
     
              
        request(wait, function (error, response, waitBody ) {
            if (!error) {
              console.log("run wait complete, container will have started");
                
                      // Get request for stdout from the container
                      request.get({
                          url: url + "/v1.40/containers/" + createBody.Id + "/logs?stdout=1",
                          }, (err, res, data) => {
                                  if (err) {
                                      console.log('Error:', err);
                                  } else if (res.statusCode !== 200) {
                                      console.log('Status:', res.statusCode);
                                  } else{
                                      // Parse the json response to access
                                      console.log("Container stdout = " + data);
                                  }
                              });
                      }
          });
          }
      });

  }   
});
  // Increment the new node ID
  newNodeStartId++;
}

// Elect a leader - Check who is the leader
function LeaderElection () {
  console.log('CALLED: leader election'); // Debug
  console.log(nodeArr);
  var thisNode = getNode();
  leader = 1;
  activeNodes = 0;
  pruneDeadNodes();
  nodeArr.forEach((node) => {
    if (node.hostname != thisNode.hostname) {
        activeNodes++;
        if (node.id > thisNode.id) {
          leader = 0;
        }
    }
    if ((leader == 1) && (activeNodes == (nodeArr.length - 1))) {
      systemLeader = 1;
    } else {
      systemLeader = 0;
      //console.log("I'm NOT the leader, it is now", node.hostname, " with ", node.id)
    }
  });
  console.log('am I the leader = ', systemLeader, ' node array size = ', nodeArr.length)
  if(systemLeader) {
    // Checks to see if lastNewNodeCreationTime within the last 20 secs or undefined ?
    if(lastNewNodeCreationTime == undefined || lastNewNodeCreationTime <= Date.now() - 20000) {
      // Create a new node while there are less than 3 nodes in the array list
      // while(nodeArr.length < minNodeCount) {  // HERE: the issue lies with this loop as lastNewNodeCreationTime starts as undefined
      //     console.log('IN LOOP!!!'); // Debug
      //     setTimeout(function(){ createNewNode(); }, 2000); // trying to delay the method for node array length to increase
      //     //createNewNode();
      //     console.log('Node array size = ', nodeArr.length); // Debug
      //     lastNewNodeCreationTime = Date.now();
      // }
        var interval = setInterval(function() {
          if (nodeArr.length < minNodeCount) {
            console.log('IN LOOP!!!'); // Debug
            createNewNode()
            console.log('EXITING LOOP!!!'); // Debug
          } else {
            clearInterval(interval);
          }
        }, 3000);
      //console.log('Last new node creation time is : ', lastNewNodeCreationTime);
      lastNewNodeCreationTime = Date.now();
    }
  }
};

// Returns the node information
function getNode () {
  const node = {
    id: nodeID,
    hostname: os.hostname(),
    lastAliveTime: Date.now()
  };

  return node
}

// Adds a node that doesn't already exist into the node array
function AddToArray(nodeToAdd) {
  if(nodeArr.some(node => node.id == nodeToAdd.id))
    return;
  nodeArr.push(nodeToAdd);
}

// Publish
amqp.connect(connectionString, function (error0, connection) {
  if (error0) {
    throw error0;
  }
  //console.log("we have a connection using: " + connectionString + "for " + myhostname)
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
      console.log(" [x] PUBLISH: Sent %s", msg);
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
          console.log(" [x] SUBSCRIBE: Received %s", msg.content.toString());
          AddToArray(JSON.parse(msg.content.toString()));
          LeaderElection();
        }
      }, {
        noAck: true
      });
    });
  });
});
