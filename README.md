#Tibbar
A very simple RabbitMQ microservice framework.

Things not yet done

- Passing in options to constructors
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
tibbar.use('double', payload => {
  return (payload.value * 2);
});

// using promises
tibbar.use('getDatePromise', () => {
  return Promise.resolve(Date.now());
});

// return nothing
tibbar.use('writeToConsole', payload => {
  console.log('Output=>', payload.msg);
});

// handle additional amqp fields
tibbar.use('printEverything', (content, properties, fields) => {
  console.log('content', content);
  console.log('properties', properties);
  console.log('fields', fields);
  return 1;
});

tibbar.connect('amqp://localhost');
```

**Client**
```javascript
const tibbar = require('tibbar').client();

tibbar.connect('amqp://localhost').then(() => {
  return Promise.all([

    // no parameters
    tibbar.call('getDate').then(date =>
      console.log(`getDate result: ${date}`)
    ),

    // with parameters
    tibbar.call('double', { value: 5 }).then(result =>
      console.log(`double result: ${result}`)
    ),

    // using promises
    tibbar.call('getDatePromise').then(date =>
      console.log(`getDatePromise result: ${date}`)
    ),

    // no response
    tibbar.cast('writeToConsole', { msg: 'lala' }),

    // print additional amqp fields
    tibbar.call('printEverything', 'Example content')

  ]);
})
.then(() => tibbar.disconnect())
.catch(() => tibbar.disconnect());
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
