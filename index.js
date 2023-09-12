const express = require('express')
const cors= require('cors')
var jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express()
const stripe=require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
const corsConfig = {
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT',"PATCH", 'DELETE']
}
app.use(cors(corsConfig))
app.options("", cors(corsConfig))

app.use(express.json())

const verifyJWT=(req,res,next)=>{
  const authorization=req.headers.authorization
  if (!authorization) {
    return res.status(401).send({error:true,message:'unauthorized access'})
  }

  const token =authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error,decoded)=>{ 
    if (error) {
    return res.status(401).send({error:true,message:'unauthorized access'})
    }

    req.decoded=decoded;
    next()
  })
}



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
    // await client.connect();


    const usersCollection= client.db("summerCampDB").collection("users")
    const classesCollection= client.db("summerCampDB").collection("classes")
    const instructorsCollection= client.db("summerCampDB").collection("instructors")
    const selectedCollection= client.db("summerCampDB").collection("selectedClasses")
    const paymentsCollection= client.db("summerCampDB").collection("paymentsCollection")


    // generate jwt token
    app.post('/jwt',(req,res)=>{
      const user=req.body
      // console.log(user)
      const token =jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' });

      res.send({token})
    })


    // verify admin middleware
    const verifyAdmin=async(req,res,next)=>{
      const email=req.decoded.email;
      const query={email: email}
      const user =await usersCollection.findOne(query)
      if (user.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next()
    }

   
    //---------------- users related api-------------

    app.get('/users', verifyJWT, verifyAdmin, async(req,res)=>{
        const result=await usersCollection.find().toArray()
        res.send(result)
    })

    // security layer: verifyJWT
    // email same
    // check admin
    //  check user role
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({error:true, message: 'unauthorized user'})
      }

      const query = { email: email }
      const result= await usersCollection.findOne(query);
      res.send(result);
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
      // console.log(id)
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
      // console.log(id)
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


  app.get('/classes/:email', verifyJWT, async(req,res)=>{
    const email=req.params.email;
    const query={email:email}

    const result=await classesCollection.find(query).toArray()
    res.send(result)
  })


  app.get('/classes/update/:id', async(req,res)=>{
    const id=req.params.id;
    const query={_id: new ObjectId(id)}

    const result=await classesCollection.findOne(query)
    res.send(result)
  })


  app.post('/classes',verifyJWT,async (req,res)=>{
      const newClass = req.body
      const result=await classesCollection.insertOne(newClass);
      res.send(result)
  })


  app.put('/classes/update/:id',async(req,res)=>{
    const id =req.params.id
    const updatedClass=req.body
    // console.log(updatedClass)
    const filter={_id:new ObjectId(id)}
    const updateDoc={
      $set:{
        AvailableSeats:updatedClass?.AvailableSeats,
        Image:updatedClass?.Image,
        Name:updatedClass?.Name,
        Price:updatedClass?.Price,
      }
    }
    const result=await classesCollection.updateOne(filter,updateDoc)
    res.send(result)
  })


    app.patch('/classes/approved/:id',async(req,res)=>{
      const id=req.params.id
      // console.log(id)
      const filter={_id: new ObjectId(id)}
      const updateDoc={
        $set:{
          status: 'approved'
        }
      }
      
      const result=await classesCollection.updateOne(filter,updateDoc);
      res.send(result)
    })


    app.patch('/classes/denied/:id',async(req,res)=>{
      const id=req.params.id
      // console.log(id)
      const filter={_id: new ObjectId(id)}
      const updateDoc={
        $set:{
          status: 'denied'
        }
      }
      
      const result=await classesCollection.updateOne(filter,updateDoc);
      res.send(result)
    })


    //---------------Carts related api------------
    app.get('/selectedClasses',verifyJWT, async(req,res)=>{
        const email=req.query.email;      
        if (!email) {
            res.send([])
        }

        const decodedEmail=req.decoded.email;
        if (decodedEmail !== email) {
          return res.status(403).send({error:true,message:'forbidden user'})         
        }

        const query={email: email}
        const result=await selectedCollection.find(query).toArray();
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
    

    //------------- payment related api------------


    app.get('/payments',verifyJWT,async(req,res)=>{
      const email=req.query.email;
      const query={email:email}
      const options={
        sort:{date:-1}
      }
      const result=await paymentsCollection.find(query,options).toArray()
      res.send(result)
    })

    // create payment intent
    app.post('/create-payment-intent',verifyJWT, async(req,res)=>{
      const {price}=req.body;
      const amount=price*100

      const paymentIntent=await stripe.paymentIntents.create({
        amount:amount,
        currency:'usd',
        payment_method_types:['card']
      })

      res.send({
        clientSecret:paymentIntent.client_secret
      })

    })


    app.post('/payments', verifyJWT, async(req,res)=>{
      const payment=req.body;
      const insertResult=await paymentsCollection.insertOne(payment)

      const query={_id:{$in:payment.classesId.map(id=>new ObjectId(id))}}
      const deleteResult=await selectedCollection.deleteMany(query)

      res.send({insertResult,deleteResult})
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