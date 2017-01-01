#Tibbar
A very simple RabbitMQ microservice framework.

Things not yet done

- Timeout on requests
- Better error handling
- Some code tidying
- So, so much

## Installation
```
npm install --save tibbar
```

## Usage
**Worker**
```javascript
const tibbar = require('tibbar').worker();

// no parameters
tibbar.use('getDate', () => {
  return Date.now();
});

// with parameters
tibbar.use('double', (payload) => {
  return (payload.value * 2);
});

// using promises
tibbar.use('getDatePromise', () => {
	return Promise.resolve(Date.now());
});

tibbar.connect('amqp://localhost');
```

**Client**
```javascript
const tibbar = require('tibbar').client('amqp://localhost');

// no parameters
tibbar.send('getDate').then(date => {
  console.log(date);
});

// with parameters
tibbar.send('double', { value: 5 }).then(result => {
  console.log(result);
});

// using promises
tibbar.send('getDatePromise').then(date => {
  console.log(date);
});
```

### Response format
**Successful**
```
{
	type: 'response',
	body: ...
}
```

**Exception**
```
{
	type: 'exception',
	name: exception name,
	body: exception message
}
```
