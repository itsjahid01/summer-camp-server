const express = require('express')
const cors= require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express()
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ekjerqg.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const usersCollection= client.db("summerCampDB").collection("users")
    const classesCollection= client.db("summerCampDB").collection("classes")
    const instructorsCollection= client.db("summerCampDB").collection("instructors")
    const selectedCollection= client.db("summerCampDB").collection("selectedClasses")

   
    //---------------- users related api-------------

    app.get('/users',async(req,res)=>{
        const result=await usersCollection.find().toArray()
        res.send(result)
    })

    app.post('/users',async(req,res)=>{
        const user=req.body
        const email=user?.email
        const query={email: email}
        const existingUser=await usersCollection.findOne(query)
        if (existingUser) {
            return res.send({message:'user already exists'})
        }
        const result=await usersCollection.insertOne(user)
        res.send(result)
    })

    // make admin api 
    app.patch('/users/admin/:id',async(req,res)=>{
      const id=req.params.id
      console.log(id)
      const filter={_id: new ObjectId(id)}
      const updateDoc={
        $set:{
          role: 'admin'
        }
      }

      const result=await usersCollection.updateOne(filter,updateDoc);
      res.send(result)
    })


    // make instructor api 
    app.patch('/users/instructor/:id',async(req,res)=>{
      const id=req.params.id
      console.log(id)
      const filter={_id: new ObjectId(id)}
      const updateDoc={
        $set:{
          role: 'instructor'
        }
      }
      
      const result=await usersCollection.updateOne(filter,updateDoc);
      res.send(result)
    })


    app.delete('/users/:id',async(req,res)=>{
      const id=req.params.id
      // console.log(id)
      const query={ _id: new ObjectId(id) }
      const result=await usersCollection.deleteOne(query)
      res.send(result)
  })

    //---------- classes related api-------------
    app.get('/classes',async(req,res)=>{
        const result=await classesCollection.find().toArray()
        res.send(result)
    })


    //---------------carts related api------------
    app.get('/selectedClasses',async(req,res)=>{
        const email=req.query.email;
        if (!email) {
            res.send([])
        }
        const query={email: email}
        const result=await selectedCollection.find(query).toArray()
        res.send(result)
    })

    app.post('/selectedClasses',async (req,res)=>{
        const item = req.body
        const result=await selectedCollection.insertOne(item)
        res.send(result)
    })

    app.delete('/selectedClasses/:id',async(req,res)=>{
        const id=req.params.id
        // console.log(id)
        const query={ _id: new ObjectId(id) }
        const result=await selectedCollection.deleteOne(query)
        res.send(result)
    })

    //------------- instructors related api------------
    app.get('/instructors',async(req,res)=>{
        const result=await instructorsCollection.find().toArray()
        res.send(result)
    })



    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Welcome to Summer Camp Server')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})