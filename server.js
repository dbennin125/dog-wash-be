require('dotenv').config();
const client = require('./lib/client');

client.connect();

const app = require('./lib/app');

const PORT = process.env.PORT || 7890;



const ensureAuth = require('./lib/auth/ensure-auth');
const createAuthRoutes = require('./lib/auth/create-auth-routes');
const authRoutes = createAuthRoutes({
  selectUser(email) {
    return client.query(`
            SELECT id, email, hash
            FROM users
            WHERE email = $1;
        `,
    [email]
    ).then(result => result.rows[0]);
  },
  insertUser(user, hash) {
    console.log(user);
    return client.query(`
            INSERT into users (email, hash)
            VALUES ($1, $2)
            RETURNING id, email;
        `,
    [user.email, hash]
    ).then(result => result.rows[0]);
  }
});


// setup authentication routes to give user an auth token
// creates a /auth/signin and a /auth/signup POST route. 
// each requires a POST body with a .email and a .password
app.use('/auth/', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api', ensureAuth);

// and now every request that has a token in the Authorization header will have a `req.userId` property for us to see who's talking
// app.get('/api/dogs', (req, res) => {
  
//   res.json({
//     message: `in this proctected route, we get the user's id like so: ${req.userId}`
//   });
// });

app.get('/api/dogs', async(req, res) => {
  // who happens to be logged in, go get THEIR dogs
  const data = await client.query('SELECT * from dogs where owner_id=$1', [req.userId]);

  res.json(data.rows);
});

app.post('/api/dogs', async(req, res) => {
  const userID = req.userId;
  const newDogData = await client.query(`
  insert into dogs(name, species, level, owner_id)
  values ($1, $2, $3, $4)
  returning *
  `, [req.body.name, req.body.species, req.body.level, userID]);
  
  res.json(newDogData.rows[0]);
});

app.put('/api/dogs/:id', async(req, res) => {
  // who happens to be logged in, update if the dog is washed
  const data = await client.query(`
  update dogs
  set is_washed=true
  where id=$1 AND owner_id=$2
  returning *
  `, [req.params.id, req.userId]);

  res.json(data.rows);
});

app.delete('/api/dogs/:id', async(req, res) => {
  const userID = req.userId;
  const washedDogData = await client.query(`
  delete from dogs
  where id=$1 and owner_id=$2
  returning *
  `, [req.params.id, userID]);
  
  res.json(washedDogData.rows[0]);
});




app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Started on ${PORT}`);
});
