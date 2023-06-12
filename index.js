const express = require('express')
require('dotenv').config()
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const jwt = require('jsonwebtoken')
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
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true,message: 'Unauthorized Access'})
  }
  const token = authorization.split(' ')[1]
  //console.log(token);
  //token verify
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({error: true,message: 'Unauthorized Access'})
    }
    req.decoded= decoded
    next()
  })

}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();
    const usersCollection = client.db('dance-flow').collection('users');
    const classCollection = client.db('dance-flow').collection('classes');

    //generate jwt token
    app.post('/jwt', async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.
      ACCESS_TOKEN_SECRET, { expiresIn: '7d', })
      //console.log(token);
      res.send({ token })
    })

    //save user email in mongodb when user is created in client side
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email
      const user = req.body
      const query = { email: email }
      const options = { upsert: true }
      const updateDoc = {
        $set: user,
      }
      const result = await usersCollection.updateOne(query, updateDoc, options)
      res.send(result)
    })
    //save users selected course in mongodb when user is created in client side
    app.put('/coursesinfo/:email', async (req, res) => {
      const email = req.params.email
      const courseId = req.body.courseId;
      //console.log(courseId);
      const query = { email: email }
      const options = { upsert: true }
      const updateDoc = {
        $addToSet: { courseIds: courseId },
      }
      const result = await usersCollection.updateOne(query, updateDoc, options)
      res.send(result)
    })

    //remove users selected ID from user courseIds
    app.put('/coursesinforemove/:email', async (req, res) => {
      const email = req.params.email;
      const courseId = req.body.courseId;
      const query = { email: email };
      const updateDoc = {
        $pull: { courseIds: courseId },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    //paid course info update in user
    app.put('/paidcoursesinfo/:email', async (req, res) => {
      const email = req.params.email
      const courseId = req.body.courseId;
      //console.log(courseId);
      const query = { email: email }
      const options = { upsert: true }
      const updateDoc = {
        $addToSet: { paidCourseIds: courseId },
      }
      const result = await usersCollection.updateOne(query, updateDoc, options)
      res.send(result)
    })
    //paid course info update in course
    app.put('/paidcoursesinfoinclasses/:email', async (req, res) => {
      const email = req.params.email;
      const studentId = req.body.studentId;
    
      const query = { instructorEmail: email };
      const options = { upsert: true };
    
      // Find the current class document
      const classDocument = await classCollection.findOne(query);
    
      if (!classDocument) {
        res.status(404).send('Class not found');
        return;
      }
    
      // Get the current availableSeats value
      const currentAvailableSeats = Number(classDocument.availableSeats);
    
      // Check if availableSeats is a valid number
      if (isNaN(currentAvailableSeats)) {
        res.status(500).send('Invalid availableSeats value');
        return;
      }
    
      // Decrease the availableSeats value by 1
      const updatedAvailableSeats = currentAvailableSeats - 1;
    
      // Check if the updated availableSeats value is greater than or equal to 0
      if (updatedAvailableSeats < 0) {
        res.status(400).send('No available seats');
        return;
      }
    
      const updateDoc = {
        $set: { availableSeats: updatedAvailableSeats.toString() },
        $push: { studentIds: studentId }
      };
    
      const result = await classCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });
    


    // Get a user
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const result = await usersCollection.findOne(query)
      
      res.send(result)
    })
    app.get('/allusers',async(req,res)=>{
      const usersInfo = await usersCollection.find().toArray()
      res.send(usersInfo)
    })

    //save course details
    app.post('/classdetail',verifyJWT, async (req, res) => {
      const classDetail = req.body;
      const result = await classCollection.insertOne(classDetail);
      res.send(result);

    })
    //get course details
    app.get('/classinfo',verifyJWT, async (req, res) => {
      const classInfo = await classCollection.find().toArray()
      res.send(classInfo)
    })
    //get all instructors
    app.get('/instructors', async (req, res) => {
      const query ={'role': 'instructor'}
      const instructors = await usersCollection.find(query).limit(6).toArray()
     // console.log(instructors);
      res.send(instructors)
    })
    // class page 
    app.get('/classpage', async (req, res) => {
      const classPage = await classCollection.find().toArray()
      res.send(classPage)
    })
    //get course for seperate instructors
    app.get('/classdetails/:email',verifyJWT, async (req, res) => {
     const decodedEmail = req.decoded.email;
      //console.log(decodedEmail);
      const email = req.params.email;
      if(email!==decodedEmail){return res.status(403).send({error: true,message: 'Forbidden Access'})}
      const query ={'instructorEmail': email}
      const classDetails = await classCollection.find(query).toArray()
      res.send(classDetails)
    })
    //get course details for seperate based on course Id
    app.get('/studentcoursedetails/:email',verifyJWT, async (req, res) => {
     const decodedEmail = req.decoded.email;
      //console.log(decodedEmail);
      const email = req.params.email;
      if(email!==decodedEmail){return res.status(403).send({error: true,message: 'Forbidden Access'})}
      //const query ={'instructorEmail': email}
      const classDetails = await classCollection.find().toArray()
      res.send(classDetails)
    })
    //update a single class information
    app.put('/updateclass/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const classInfo = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateClassInfo = {
        $set: {
          price: classInfo.price,
          availableSeats: classInfo.availableSeats,
        }
      }
      const result = await classCollection.updateOne(filter, updateClassInfo, options);
      res.send(result);
    })
    // update clase status
    app.put('/classdata/:id',verifyJWT, async (req, res) => {
      const id = req.params.id;
      const classData = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          status: classData.status
        }
      }
      const result = await classCollection.updateOne(filter, updateDoc, options)
      res.send(result)
    })
    // update class feedback
    app.put('/classfeedback/:id', async (req, res) => {
      const id = req.params.id;
      const classData = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          feedback: classData.feedback
        }
      }
      const result = await classCollection.updateOne(filter, updateDoc, options)
      res.send(result)
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