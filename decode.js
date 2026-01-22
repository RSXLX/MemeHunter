const bs58 = require('bs58');
const key = 'CPo1f4ZNjCsnE9WEFUmd3oYKzo43ANejAFpWF44R3fqjv';
console.log(JSON.stringify(Array.from(bs58.decode(key))));
