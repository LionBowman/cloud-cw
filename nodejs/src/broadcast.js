var amqp = require('amqplib/callback_api');
var connectionString = 'amqp://user:bitnami@192.168.91.3:5672';
var vmIP = '192.168.91.3';
var url = (`http://${vmIP}:2375`);

// Get the hostname of the node
var os = require("os");
var myhostname = os.hostname();
// IP Address variable
var defineAddr;

// Gets the IP address of the node
var ipaddr = require('dns').lookup(require('os').hostname(), function (err, add, fam) {
  defineAddr = add;
})

// Import the request library
var request = require('request');

// Initialise not as the leader
var systemLeader = 0;
// Initial number of containers (on startup)
const targetNodeCount = 3;
// Initial ID number for newly created nodes
var newNodeStartId = 1;
// Time variable for the last created node (additional to the starting nodes)
var lastNewNodeCreationTime = Date.now(); 
// Initial Empty node array
var nodeArr = [];
// Timeout for dead node pruning
const pruneTimeout = 30000;
// Sets the node ID based on current date/time in milliseconds
var nodeID = Date.now();

// Removes dead nodes from the node array list
function pruneDeadNodes() {
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
  var thisNode = getNode();
  leader = 1;
  activeNodes = 0;
  pruneDeadNodes();
  nodeArr.forEach((node) => {
    if (node.hostname != thisNode.hostname) {
        activeNodes++;
        if (node.id < thisNode.id) {
          leader = 0;
        }
    }
    if ((leader == 1) && (activeNodes == (nodeArr.length - 1))) {
      systemLeader = 1;
    } else {
      systemLeader = 0;
    }
  });
  console.log('Am I the leader? :- ', systemLeader, ' Node array size = ', nodeArr.length)
  if(systemLeader) {
    // Checks to see if lastNewNodeCreationTime within the last 20 secs
    if(lastNewNodeCreationTime <= Date.now() - 20000) {
      // Create a new node while there are less than 3 nodes in the array list
      var currentNodeLength = nodeArr.length;
      var timeAdjustedNodeCount = targetNodeCount;
      const date = new Date();
      // Service provision schedule - peak time specified as 17:00 ~ 22:00 (UTC)
      if (date.getHours() > 17 && date.getHours() < 22) {
        timeAdjustedNodeCount += 2;
      }
      while(currentNodeLength != timeAdjustedNodeCount) {
          if(currentNodeLength < timeAdjustedNodeCount) {
            createNewNode();
            currentNodeLength++;
          } else {
            // Removes the node with the Highest ID
            const nodeToRemove = nodeArr.sort((a, b) => a.id - b.id).pop().hostname;
            sendDeleteRequest(nodeToRemove);
            currentNodeLength--;
          }
      }
      lastNewNodeCreationTime = Date.now();
    }
  }
};
// Request for removing a node
function sendDeleteRequest (nodeName) {
  var deleteReq = {
    uri: `${url}/v1.40/containers/${nodeName}?force=true`,
    method: 'DELETE'
  }
  // Container start request
  request(deleteReq, function (error, _response, _Body) {
    if (!error) {
      console.log("Container delete completed");
    }
  })
}

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
  var nodeIndex = nodeArr.findIndex(node => node.id == nodeToAdd.id);
  if(nodeIndex < 0)
    nodeArr.push(nodeToAdd);
  else 
    nodeArr[nodeIndex] = nodeToAdd;
}

// Publish
amqp.connect(connectionString, function (error0, connection) {
  if (error0) {
    throw error0;
  }
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
