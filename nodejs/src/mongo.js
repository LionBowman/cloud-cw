//Object data modelling library for mongo
const mongoose = require('mongoose');

//connection string listing the mongo servers. This is an alternative to using a load balancer.
const connectionString = 'mongodb://localmongo1:27017,localmongo2:27017,localmongo3:27017/notFlixDB?replicaSet=rs0';

//connect to the cluster
mongoose.connect(connectionString, {useNewUrlParser: true, useUnifiedTopology: true});


var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var Schema = mongoose.Schema;

var analyticsSchema = new Schema({
  accountId: String, 
  userName: String, 
  titleId: String, 
  userAction: String,
  dateAndTime: String,
  pointOfInteraction: String,
  typeOfInteraction: String
});

var analyticsModel = mongoose.model('analytics', analyticsSchema, 'analytics');

module.exports = {analyticsModel}