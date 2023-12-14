const express = require('express');
const app=express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.PAYMENT_KEY);
const port= process.env.PORT || 5000;
require("dotenv").config();

//middlware

app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7di2jdk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const menuCollection=client.db('premium-dine').collection('menu');
    const usersCollection=client.db('premium-dine').collection('users');
    const reviewCollection=client.db('premium-dine').collection('reviews');
    const cartCollection=client.db('premium-dine').collection('carts');

    // jwt
    app.post ('/jwt',(req,res)=>{
      const user=req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({token});
    })

    // menu api 
    app.get('/menu', async(req,res)=>{
        const result= await menuCollection.find().toArray();
        res.send(result);
    })

    app.post('/menu',async(req,res)=>{
      const newItem=req.body;
      const result=await menuCollection.insertOne(newItem);
      res.send(result);
    }) 

    app.delete("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    });
    // user api 

    app.get('/users',async(req,res)=>{
      const users=await usersCollection.find().toArray();
      res.send(users);
    })
    app.post('/users',async(req,res)=>{
      const user=req.body;
      const query={email:user.email};
      const existingUser=await usersCollection.findOne(query);
      if(existingUser){
        return res.send({message: 'user already exists'})
      }
      const result= await usersCollection.insertOne(user);
      res.send(result); 
    })

    app.get('/users/admin/:email', async(req,res)=>{
      const email=req.params.email;
      const query= {email:email};
      const user=await usersCollection.findOne(query);
      const result= {admin:user?.role==='admin'};
      res.send(result);
    })

    app.patch('/users/admin/:id', async(req,res)=>{
      const id=req.params.id;
      const filter={_id: new ObjectId(id)};
      const updateDoc={
        $set: {
          role: 'admin'
        },
      };

      const result=await usersCollection.updateOne(filter,updateDoc);
      res.send(result);
    })

    app.delete("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });
    //cart api
    app.post('/cart',async(req,res)=>{
      const item=req.body;
      console.log(item);
      const result=await cartCollection.insertOne(item);
      res.send(result);
    })

    app.get('/cart', async(req,res)=>{
      const email=req.query.email;
      if(!email){
        res.send([]);
      }
      const query= {email:email};
      const result=await cartCollection.find(query).toArray();
      res.send(result);
    })

    app.delete('/cart/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)};
      const result=await cartCollection.deleteOne(query);
      res.send(result);
    })

    // payment intent api
    app.post('/create-payment-intent', async (req,res)=>{
      const {price}=req.body;
      const amount=price*100;
      const paymentIntent= await stripe.paymentIntents.create({
        amount:amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req,res)=>{
    res.send('running');
})

app.listen(port, ()=>{
    console.log(`server running at port ${port}`)
})