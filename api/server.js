const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const jsonServer = require('json-server');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yaml');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid'); // para generar IDs únicos

const app = express();
const jsonServerRouter = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

app.use(cors());
app.use(bodyParser.json());

// Cargar archivo Swagger YAML
const swaggerFile = fs.readFileSync(path.join(__dirname, 'swagger.yaml'), 'utf8');
const swaggerDocument = yaml.parse(swaggerFile);

// Ruta para la documentación de Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(middlewares);


//ids:

// Endpoints personalizados:

// GET accounts
app.get('/api/v1/accounts', (req, res) => {
  const db = jsonServerRouter.db;
  const accounts = db.get('accounts').value();
  res.json(accounts);
});

app.post('/api/v1/accounts', async (req, res) => {
  console.log("Datos recibidos en /api/v1/accounts:", req.body);
  const db = jsonServerRouter.db;
  const { user, email, pass } = req.body;

  // Verifica si el usuario o el email ya existen
  const existingUser = db.get('accounts').find(account => account.user === user || account.email === email).value();
  if (existingUser) {
    return res.status(400).json({ error: 'User or email already exists' });
  }

  // Hashear la contraseña
  const hashedPass = await bcrypt.hash(pass, 10);

  const newAccount = {
    id: db.get('accounts').value().length + 1,
    user,
    email,
    pass: hashedPass,
    bio: "",
    _id: uuidv4()
  };

  db.get('accounts').push(newAccount).write();
  res.status(201).json(newAccount);
});
//login

app.post('/api/v1/accounts/login', (req, res) => {
  console.log("Datos recibidos en /api/v1/login:", req.body);
  const db = jsonServerRouter.db;
  const { user, email,pass } = req.body; // Verifica que 'pass' coincida con el nombre enviado desde el frontend

  const account = db.get('accounts').find(account => account.user === user || account.email === email).value();

  if (account ) {
    if (bcrypt.compareSync(pass, account.pass.toString())) {
      res.json({ message: 'Login successful', user: account.user, _id: account._id });
    }
    else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});
//delete login
app.delete('/api/v1/accounts/login/:_id', (req, res) => {
  const db = jsonServerRouter.db;
  const account = db.get('login').find({ _id: req.params._id }).value();
  if (account) {
    db.get('login').remove({ id: account.id }).write();
    res.status(200).json({ message: 'Account deleted successfully' });
  } else res.status(404).json({ error: 'Not Found' });
});
// GET account by user
app.get('/api/v1/accounts/:user', (req, res) => {
  const db = jsonServerRouter.db;
  const account = db.get('accounts').find({ user: req.params.user }).value();
  if (account) res.json(account);
  else res.status(404).json({ error: 'Not Found' });
});

// PUT account by user
app.put('/api/v1/accounts/:_id', (req, res) => {
  const db = jsonServerRouter.db;
  const _id = req.params._id;
  const { user, email,bio } = req.body;

  // Buscar la cuenta por el _id
  const account = db.get('accounts').find({ _id }).value();

  if (account) {
    // Actualizar la cuenta
    if (user) db.get('accounts').find({ _id }).assign({ user }).write();
    if (email) db.get('accounts').find({ _id }).assign({ email }).write();
    if (bio) db.get('accounts').find({ _id }).assign({ bio }).write();

    const updatedAccount = db.get('accounts').find({ user }).value();
    res.status(200).json({ message: 'Account updated successfully', account: updatedAccount });
  } else {
    res.status(404).json({ error: 'Not Found' });
  }
});

// PUT account by _id (change password)
app.put('/api/v1/accounts/:_id/change-password', async (req, res) => {
  const db = jsonServerRouter.db;
  const _id = req.params._id;
  const {newPassword } = req.body;

  // Buscar la cuenta por el nombre de usuario
  const account = db.get('accounts').find({_id}).value();

  if (account) {
    console.log(newPassword);
    // Hashear la nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword.toString(), 10);

    // Actualizar la contraseña
    db.get('accounts').find({ _id}).assign({ pass: hashedNewPassword }).write();

    res.status(200).json({ message: 'Password updated successfully' });
  } else {
    res.status(404).json({ error: 'Not Found' });
  }
});

// DELETE account by user
app.delete('/api/v1/accounts/:_id', (req, res) => {
  const _id=req.params._id;
  const db = jsonServerRouter.db;
  const account = db.get('accounts').find({ _id: _id }).value();
  if (account) {
    db.get('accounts').remove({_id}).write();
    res.status(200).json({ message: 'Account deleted successfully' });
  } else res.status(404).json({ error: 'Not Found' });
});
/////////////////////////////////////////////////////////////////










// ENDPOINTS para dietas:
// GET diets by user
app.get('/api/v1/accounts/:user/diets', (req, res) => {
  const db = jsonServerRouter.db;
  const diets = db.get('diets').filter({ user: req.params.user }).value();
  res.json(diets);
});

// POST diet for a user
app.post('/api/v1/accounts/:user/diets', (req, res) => {
  const db = jsonServerRouter.db;
  const account = db.get('accounts').find({ user: req.params.user }).value();

  // Check if there is already a diet entry for the user
  const existingDiet = db.get('diets').find({ user: req.params.user }).value();

  if (existingDiet) {
    return res.status(400).json({ error: 'Diet entry already exists for this user' });
  }

  if (account) {
    const { sex, age, weight, height, IMC, foods } = req.body;
    const newDiet = {
      user: req.params.user, // Add the user field to the new diet
      sex,
      age,
      weight,
      height,
      IMC,
      foods,
    };

    db.get('diets').push(newDiet).write();
    res.json(newDiet);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// GET all posts
app.get('/api/v1/posts', (req, res) => {
  const db = jsonServerRouter.db;
  const posts = db.get('posts').value();
  const postsReverse = [...posts].reverse(); // Create a copy before reversing
  res.json(postsReverse);
});
//get post _id

app.get('/api/v1/posts/:_id', (req, res) => {
  const db = jsonServerRouter.db;
  const _id = req.params._id;
  const post = db.get('posts').find({ _id }).value();

  if (post) {
    res.json(post);
  } else {
    res.status(404).json({ error: 'Post not found' });
  }
});
// POST a new post
app.post('/api/v1/posts', (req, res) => {
  const db = jsonServerRouter.db;
  const { title, content, user,user_id } = req.body;
  const currentDate = new Date().toISOString(); // Get current date in ISO format

  const newPost = {
    id: db.get('posts').value().length + 1,
    title,
    content,
    user,
    user_id,
    comments: [],
    likes: 0, // Initialize likes
    date: currentDate,
    _id:uuidv4()
  };

  db.get('posts').push(newPost).write();
  res.json(newPost);
});
app.post('/api/v1/posts/:postId/comments', (req, res) => {
  const db = jsonServerRouter.db;
  const { postId } = req.params;
  const { idAuthor,author, content } = req.body;
  const currentDate = new Date().toISOString(); // Obtener la fecha actual en formato ISO

  const newComment = {
    id: uuidv4(),
    idAuthor,
    author,
    content,
    date: currentDate
  };

  const post = db.get('posts').find({ _id: postId }).value();
  if (post) {
    post.comments.push(newComment);
    db.get('posts').find({ _id:postId }).assign(post).write();
    res.status(201).json(newComment);
  } else {
    res.status(404).json({ error: 'Post not found' });
  }
});
// GET posts by user
app.get('/api/v1/posts/filterByUser', (req, res) => {
  const db = jsonServerRouter.db;
  const {_id} = req.query;
  console.log(db.get('posts').value());
  const posts = db.get('posts').filter({ user_id: _id }).value();
  res.json(posts);
});

// DELETE a post by id
app.delete('/api/v1/posts/:id', (req, res) => {
  const db = jsonServerRouter.db;
  const postId = parseInt(req.params.id);

  const post = db.get('posts').find({ id: postId }).value();

  if (post) {
    db.get('posts').remove({ id: postId }).write();
    res.status(200).json({ message: 'Post deleted successfully' });
  } else {
    res.status(404).json({ error: 'Post not found' });
  }
});

// PUT update a post by id
app.put('/api/v1/posts/:id', (req, res) => {
  const db = jsonServerRouter.db;
  const postId = parseInt(req.params.id);
  const post = db.get('posts').find({ id: postId }).value();

  if (post) {
    const { title, content } = req.body;

    db.get('posts')
      .find({ id: postId })
      .assign({ title, content })
      .write();

    res.json({
      id: postId,
      title,
      content,
      author: post.author,
      comments: post.comments,
      likes: post.likes,
      date: post.date,
    });
  } else {
    res.status(404).json({ error: 'Post not found' });
  }
});
app.put('/api/v1/posts/:id/like', (req, res) => {
  const db = jsonServerRouter.db;
  const postId = parseInt(req.params.id);
  const { _id } = req.body;
  const post = db.get('posts').find({ id: postId }).value();

  if (post) {
    const likedBy = post.liked_by || [];
    const userIndex = likedBy.indexOf(_id);
    console.log(_id);
    if (userIndex === -1) {
      // Usuario no ha dado "like" antes, así que añade el "like" y el usuario
      post.likes = (post.likes || 0) + 1;
      likedBy.push(_id);
    } else {
      // Usuario ya ha dado "like", así que elimina el "like" y el usuario
      post.likes = Math.max(0, post.likes - 1);
      likedBy.splice(userIndex, 1);
    }

    // Actualiza el post en la base de datos
    db.get('posts')
      .find({ id: postId })
      .assign({ likes: post.likes, liked_by: likedBy })
      .write();

    res.json({
      id: postId,
      title: post.title,
      content: post.content,
      author: post.author,
      comments: post.comments,
      likes: post.likes,
      liked_by: likedBy,
      date: post.date,
    });
  } else {
    res.status(404).json({ error: 'Post not found' });
  }
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`JSON Server is running on port ${port}`);
});
