const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { client, app } = require('.');


async function run() {
  try {
    const userCollection = client.db('parcelDB').collection('users');
    const bookCollection = client.db('parcelDB').collection('books');
    const paymentCollection = client.db('parcelDB').collection('payments');

    // post jwt in sever 
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' });
      res.send({ token });
    });
    // middleware 
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
      });
    };
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
    };
    // users related api
    app.get('/users', verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // users admin email 
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    });
    // users section 
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // user patch 
    // user delete 
    // Get user role
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email });
      res.send(result);
    });


    // book section 
    app.get('/books', async (req, res) => {
      const result = await bookCollection.find().toArray();
      res.send(result);
    });
    app.get('/books', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      console.log(query);
      const result = await bookCollection.find(query).toArray();
      res.send(result);
    });
    app.post('/books', async (req, res) => {
      const bookitem = req.body;
      const result = await bookCollection.insertOne(bookitem);
      res.send(result);
    });

    app.delete('/books/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookCollection.deleteOne(query);
      res.send(result);
    });
    app.get('/books/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookCollection.findOne(query);
      res.send(result);
    });
    app.patch('/books/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
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
      };
      const result = await bookCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });


    payment;
    // await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
exports.run = run;