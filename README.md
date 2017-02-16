# Tibbar
  Minimalist microservice framework for [node](http://nodejs.org) and [RabbitMQ](https://rabbitmq.com).

  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]

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