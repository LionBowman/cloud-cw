//Express web service library
const { request } = require('express');
const express = require('express');
const broadcast = require('./broadcast.js');
const mongo = require('./mongo.js');

//instance of express and port to use for inbound connections.
const app = express()
const port = 3000

//tell express to use the body parser. Note - This function was built into express but then moved to a seperate package.
app.use(express.json());

app.post("/", async (request, response, _) => {
    const analytics = await postAnalaytics(request.body);
    response.json(analytics);
  })
    async function postAnalaytics(request) {
      const newDbAnalytics = new mongo.analyticsModel({
        accountId: request.accountId, 
        userName: request.userName, 
        titleId: request.titleId, 
        userAction: request.userAction,
        dateAndTime: request.dateAndTime,
        pointOfInteraction: request.pointOfInteraction,
        typeOfInteraction: request.typeOfInteraction
      });
  
      return newDbAnalytics.save()
      .then(() => {
        return newDbAnalytics;
      })
      .catch((err) => { return err; });
    }

//bind the express web service to the port specified
app.listen(port, () => {
    console.log(`Express Application listening at port ` + port)
   })