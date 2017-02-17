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