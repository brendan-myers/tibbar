# Tibbar
  Minimalist microservice framework for [node](http://nodejs.org) and [RabbitMQ](https://rabbitmq.com).

  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]
  [![Build][travis-image]][travis-url]
  [![Coverage Status][coveralls-image]][coveralls-url]

```bash
npm install tibbar
```

## Usage

### Service Workers

Workers bind handlers to a route with `accept(route, handler)`. Like _Express_, handlers are passed a request and a response object.

Routes can be bound both before and after the worker has connected to a RabbitMQ server.

```js
const tibbar = require('tibbar');
const worker = tibbar().worker;

// Worker
worker.accept('/', (req, res) => {
  res.send('Hello, world!').ack();
});
worker.connect('amqp://localhost');
```

### Clients

After connecting to a RabbitMQ server, clients can send requests to routes with `call(route, payload, timeout)`, which returns a promise containomg a `result` object.

Payloads can be buffers, strings, integers, or objects.

```js
// Client
const tibbar = require('tibbar');
const client = tibbar().client;

client.connect('amqp://localhost').then(() => {
  return client.call('/');
}).then(res => {
  console.log(res.asString());
  client.disconnect();
});
```

### Custom middleware

Tibbar supports Express style middleware functions.

```js
const tibbar = require('tibbar');
const worker = tibbar().worker;

// Worker
const middleware = (res, req, next) => {
  console.log('Middleware');
  next();
};

worker.use(middleware);

worker.accept('/', (req, res) => {
  res.send('Hello, world!').ack();
});
worker.connect('amqp://localhost');
```

### Combined client/worker

If a worker needs to call other workers, then instead of separate client and worker instances, an `application` instance can be created.

An `application` is just a thin wrapper for the underlying client/worker instances, although only one (shared) connection is opened to the RabbitMQ server.

```js
const tibbar = require('tibbar');
const app = tibbar();

app.accept('/signoff', (req, res) => {
  res.send('Have a nice day!').acl();
});

app.accept('/greeting', (req, res1) => {
  app.call('/signoff').then(res2 => {
    res1.send(`Hello, ${req.content.asString()}. ${res2.asString()}`).ack();
  });
});

app.connect('amqp://localhost').then(() => {
  return app.call('/greeting', 'Tibbar');
}).then(res => {
  console.log(res.asString());
  app.disconnect();
});
```

### License
  [MIT](LICENSE)


[npm-image]: https://img.shields.io/npm/v/tibbar.svg
[npm-url]: https://npmjs.org/package/tibbar
[downloads-image]: https://img.shields.io/npm/dm/tibbar.svg
[downloads-url]: https://npmjs.org/package/tibbar
[travis-image]: https://travis-ci.org/brendan-myers/tibbar.svg?branch=master
[travis-url]: https://travis-ci.org/brendan-myers/tibbar
[coveralls-image]: https://coveralls.io/repos/github/brendan-myers/tibbar/badge.svg
[coveralls-url]: https://coveralls.io/github/brendan-myers/tibbar