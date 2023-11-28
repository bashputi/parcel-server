const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5002;

// middleware 
app.use(cors({
    origin: [
       'https://parcel-delivery-user.web.app' ,
       'https://parcel-delivery-user.firebaseapp.com'
      
    ]
  }
  
  ))
  app.use(express.json());

  const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fobkzbd.mongodb.net/?retryWrites=true&w=majority`;
  const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const userCollection = client.db('parcelDB').collection('users');
    const bookCollection = client.db('parcelDB').collection('books');
    const paymentCollection = client.db('parcelDB').collection('payments');
    const profileCollection = client.db('parcelDB').collection('profiles');
    const ratingCollection = client.db('parcelDB').collection('ratings');
    
// post jwt in sever 
app.post('/jwt', async(req, res) => {
  const user = req.body;
//  console.log("Secret key:", process.env.ACCESS_TOKEN_SECRET);
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30d' });
    res.send({ token });
})
    // middleware 
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }
     // use verify admin after verifyToken
     const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }
    //  const verifyCommoner = async (req, res, next) => {
    //   const email = req.decoded.email;
    //   const query = { email: email };
    //   const user = await userCollection.findOne(query);
    //   const isCommoner = user?.role === 'commoner';
    //   if (!isCommoner) {
    //     return res.status(403).send({ message: 'forbidden access' });
    //   }
    //   next();
    // }
    // users related api
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.get('/users', async(req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
        const result = await userCollection.find()
        .skip(page * size)
        .limit(size)
        .toArray();
        res.send(result);
    })
    // app.get('/users', async(req, res) => {
    //   const role = req.query.role;
    //   console.log(role)
    //   const query = { role: role };
    //   const result = await userCollection.find(query).toArray();
    //   res.send(result);
    // })
    // users admin email 
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })
    // deliveryman 
    app.get('/users/deliveryman/:email', verifyToken,  async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let deliveryman = false;
      if (user) {
        deliveryman = user?.role === 'deliveryman';
      }
      res.send({ deliveryman });
    })
    app.get('/users/commoner/:email', verifyToken,  async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let commoner = false;
      if (user) {
        commoner = user?.role === 'commoner';
      }
      res.send({ commoner });
    })
     // users section 
     app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if user doesnt exists: 
      // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // user patch 
    app.patch('/users/admin/:id',  async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    }) 
    app.patch('/users/deliveryman/:id',  async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'deliveryman'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })
    // user delete 
    app.get('/users/deliveryman', async (req, res) => {
      try {
        const role = 'deliveryman';
        const result = await userCollection.find({ role: role }); // Query for users with the role of 'deliveryman'
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });
    // Get user role
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email
      const result = await userCollection.findOne({ email })
      res.send(result)
    })

    // book section 
    // app.patch('/books/status/:id',  async (req, res) => {
    //   const id = req.params.id;
    //   const filter = { _id: new ObjectId(id) };
    //   const updatedDoc = {
    //     $set: {
    //       status: 'on the way'
    //     }
    //   }
    //   const result = await bookCollection.updateOne(filter, updatedDoc);
    //   res.send(result);
    // })
    app.patch('/books/tasks/:id',  async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'Cancelled'
        }
      }
      const result = await bookCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })
    app.patch('/books/delivers/:id',  async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'delivered'
        }
      }
      const result = await bookCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })
    app.patch('/books/assign/:id',  async (req, res) => {
      const item = req.body;
      console.log(item)
      const id = req.params.id;
      console.log(id)
      const filter = { _id: new ObjectId(id) };
      console.log(filter)
      const updatedDoc = {
        $set: {
          deliverydate: item.deliverydate,
          deliverymanid: item.deliverymanid,
          status: 'on the way'
        }
      }
      const result = await bookCollection.updateOne(filter, updatedDoc );
      res.send(result);
    })
    app.get('/books', async (req, res) => {
      const result = await bookCollection.find().toArray();
      res.send(result);
    });
    app.get('/books/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id)};
      const result = await bookCollection.findOne(query);
      res.send(result);
    }) 
    // app.get('/books/:email', async (req, res) => {
    //   const email = req.params.email
    //   const result = await bookCollection.findOne({ email })
    //   res.send(result)
    // })
    app.get('/books',  async(req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await bookCollection.find(query).toArray();
      res.send(result);
    })
    app.post('/books', async(req, res) => {
      const bookitem = req.body;
      const result = await bookCollection.insertOne(bookitem);
      res.send(result);
    })    
    app.delete('/books/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookCollection.deleteOne(query);
      res.send(result)
    })
    app.patch('/books/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id)};
      const updatedDoc = {
        $set: {
          address: item.address,
          date: item.date,
          email: item.email,
          latitude: item.latitude,
          longitude: item.longitude,
          name: item.name,
          phnno: item.phnno,
          price: item.price,
          receivername: item.receivername,
          receiverphnno: item.receivername,
          type: item.type,
          weight: item.weigth,
          status: 'pending'
        }
      }
      const result = await bookCollection.updateOne(filter, updatedDoc);
      res.send(result);
    }) 
  
    // payment instant
    app.post('/create-payment-intent', async(req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })
    app.post('/payments', async(req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      console.log(paymentResult);
      const query = {_id: {
        $in: payment.cartIds.map(id => new ObjectId(id))
      }};
     
      res.send({paymentResult, query})
    })
    app.get('/payments/:email',  async(req, res) => {
      const query = { email: req.params.email };
      if(req.params.email !== req.decoded.email){
        return res.status(403).send({ message: 'forbidden access' });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })
    // profile 
    // app.get('/profiles', async (req, res) => {
    //   const result = await profileCollection.find().toArray();
    //   res.send(result);
    // });
    app.get('/profiles', async(req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await profileCollection.find(query).toArray();
      res.send(result);
    })
    app.post('/profiles', async(req, res) => {
      const item = req.body;
      const result = await profileCollection.insertOne(item);
      res.send(result);
    })
    app.get('/profiles/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id)};
      const result = await profileCollection.findOne(query);
      res.send(result);
    }) 
    app.patch('/profiles/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id)};
      const updatedDoc = {
        $set: {
         image: item.image,
          email: item.email,
        }
      }
      const result = await profileCollection.updateOne(filter, updatedDoc);
      res.send(result);
    }) 
  
  //  stats 
  app.get('/stats',  async(req, res) => {
    const users = await userCollection.estimatedDocumentCount();
    const bookItems = await bookCollection.estimatedDocumentCount();
   
    res.send({
      users,
      bookItems,
     
    })
  })
  // ratings 
  app.post('/ratings', async(req, res) => {
    const bookitem = req.body;
    const result = await ratingCollection.insertOne(bookitem);
    res.send(result);
  })
  app.get('/ratings', async (req, res) => {
    const result = await ratingCollection.find().toArray();
    res.send(result);
  });

    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Delivery is runnig')
})
app.listen(port, () => {
    console.log(`Delivery is running on port ${port}`);
})


