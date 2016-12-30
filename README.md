#Tibbar
A very simple RabbitMQ microservice framework.

## Usage

### Example

```javascript
const tibbar = require('tibbar');
const app = tibbar();

app.use('getDate', (data) => {
  return Date.now().toString();
});

app.connect('amqp://localhost');
```