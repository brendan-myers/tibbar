#Tibbar
A very simple RabbitMQ microservice framework.

Things not yet done

- Timeout on requests
- Handling of passing data other than strings
- So, so much

## Installation
*In the Tibbar direcory*
```
> gulp
> npm link
```

*In your project directory*
```
> npm link tibbar
```

## Usage
**Worker**
```javascript
const tibbar = require('tibbar').worker();

// no parameters
tibbar.use('getDate', () => {
  return Date.now().toString();
});

// with parameters
tibbar.use('double', (number) => {
  return number * 2;
});

tibbar.connect('amqp://localhost');
```

**Client**
```javascript
const tibbar = require('tibbar').client('amqp://localhost');

// no parameters
tibbar.send('getDate').then(date => {
  console.log(date);
}).catch(ex => {
  console.log(`Ex: ${ex}`);
});

// with parameters
tibbar.send('double', 5).then(double => {
  console.log(double);
}).catch(ex => {
  console.log(`Ex: ${ex}`);
});
```

##