const jsonServer = require('json-server')
const path=require('path');
const cors=require('cors');

const server = jsonServer.create()
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults()
const routes=require('./routes.json');
server.use(cors());

// Set default middlewares (logger, static, cors and no-cache)
server.use(middlewares);
server.use(jsonServer.rewriter(routes));
server.use(router);

const port=process.env.PORT ||3000;
server.listen(port, () => {
  console.log('JSON Server is running');
});