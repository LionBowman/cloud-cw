//Express web service library
const express = require('express');
const broadcast = require('./broadcast.js');
const mongo = require('./mongo.js');

//instance of express and port to use for inbound connections.
const app = express()
const port = 3000

//tell express to use the body parser. Note - This function was built into express but then moved to a seperate package.
app.use(express.json());

app.get('/', (_, res) => {
    var get = mongo.getAll()
    console.log(`this is the get response : ` + get)
    res.json(get);
})
  
app.post('/', async (req, res) => {
    await res.json(mongo.postAll(req.body))
})

//bind the express web service to the port specified
app.listen(port, () => {
    console.log(`Express Application listening at port ` + port)
   })