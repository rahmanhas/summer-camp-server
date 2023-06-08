const express = require('express')
require('dotenv').config()
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const jwt =require('jsonwebtoken')
app.use(cors())
app.use(express.json())

// const uri = `mongodb+srv://${process.env.USER_ID}:${process.env.USER_PASS}@cluster0.di1kiaj.mongodb.net/?retryWrites=true&w=majority`;
const uri = `mongodb+srv://${process.env.USER_ID}:${process.env.USER_PASS}@cluster0.di1kiaj.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  //verify jwt from client to server
  const verifyJWT = (req,res,next)=>{
    const authorization = req.headers.authorization;
    console.log(authorization);
    //token verify



    next()
  }

  async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      //await client.connect();
      const usersCollection = client.db('dance-flow').collection('users');
      const classCollection = client.db('dance-flow').collection('classes');


      //generate jwt token
      app.post('/jwt',async(req,res)=>{
        const email = req.body;
        const token = jwt.sign(email,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '7d',})
        res.send({token})
      })

      //save user email in mongodb when user is created in client side
      app.post('/users', async (req, res) => {
        const user = req.body;
        const query = { email: user.email }
        const existingUser = await usersCollection.findOne(query);
  
        if (existingUser) {
          return res.send({ message: 'user already exists' })
        }
  
        const result = await usersCollection.insertOne(user);
        res.send(result);
      });

      //save course details
      app.post('/classdetail', async(req,res)=>{
        const classDetail = req.body;
        const result = await classCollection.insertOne(classDetail);
        res.send(result);

      })
      //get course details
      app.get('/classinfo', async(req,res)=>{
        const classInfo = await classCollection.find().toArray()
        res.send(classInfo)
      })




      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
      //await client.close();
    }
  }
  run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('summer-camp-school-server is working...')
})

app.listen(port, () => {
  console.log(`summer-camp-school-server listening on port ${port}`)
})