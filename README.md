# Tibbar
  Minimalist microservice framework for [node](http://nodejs.org) and [RabbitMQ](https://rabbitmq.com).

  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]
  [![Build][travis-image]][travis-url]
  [![Coverage Status][coveralls-image]][coveralls-url]

```js
const tibbar = require('tibbar');
const app = tibbar();

app.accept('/', (req, res) => {
  res.send('Hello, world!').ack();
});

app.connect('amqp://localhost').then(() => {
  return app.call('/');
}).then(res => {
  console.log(res.asString());
  app.disconnect();
});
```

## Installation
```bash
npm install tibbar
```

## Examples

### Separate client/worker
```js
const tibbar = require('tibbar');
const worker = tibbar().worker;
const client = tibbar().client;

// Worker
worker.accept('/', (req, res) => {
  res.send('Hello, world!').ack();
});
worker.connect('amqp://localhost');

// Client
client.connect('amqp://localhost').then(() => {
  return client.call('/');
}).then(res => {
  console.log(res.asString());
  client.disconnect();
  worker.disconnect();
});
```

### Middleware

Tibbar supports Express style middleware functions.
```js
const tibbar = require('tibbar');
const worker = tibbar().worker;
const client = tibbar().client;

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

// Client
client.connect('amqp://localhost').then(() => {
  return client.call('/');
}).then(res => {
  console.log(res.asString());
  client.disconnect();
  worker.disconnect();
});
```

## License
  [MIT](LICENSE)


[npm-image]: https://img.shields.io/npm/v/tibbar.svg
[npm-url]: https://npmjs.org/package/tibbar
[downloads-image]: https://img.shields.io/npm/dm/tibbar.svg
[downloads-url]: https://npmjs.org/package/tibbar
[travis-image]: https://travis-ci.org/brendan-myers/tibbar.svg?branch=master
[travis-url]: https://travis-ci.org/brendan-myers/tibbar
[coveralls-image]: https://coveralls.io/repos/github/brendan-myers/tibbar/badge.svg
[coveralls-url]: https://coveralls.io/github/brendan-myers/tibbar