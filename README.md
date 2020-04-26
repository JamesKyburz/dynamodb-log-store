# dynamodb-log-store

WIP log store implementation using DynamoDB.

Inspiration from [level-eventstore](https://github.com/JamesKyburz/level-eventstore)

### start
```sh
cd packages/log-stack
docker-compose up -d
sls dynamodb migrate
npm ci
npm start
```

### stop
```sh
CTRL^C
docker-compose down
```

### graphql

open GraphiQL with http://localhost:5000

mutation example

```graphql
mutation {
  a: append(log: "users", id: "x", jsonBody: "{ \"name\":\"john\"}" type: "create")
  b: append(log: "users", id: "x", jsonBody: "{ \"verify\":true}" type: "verify")
  c: append(log: "users", id: "y", jsonBody: "{ \"name\":\"George Smyth\"}" type: "create")
  d: append(log: "users", id: "x", jsonBody: "{ \"name\":\"John Smith\"}" type: "update")
  e: append(log: "users", id: "y", jsonBody: "{ \"likes\":10000}" type: "likes")
}
```

query example

```graphql
{
  logList(limit: 1) {
    logs {
      name
      lastSequence
    }
    lastEvaluatedKey { pk, sk }
  },
  y: streamById(log: "users", id: "y", limit: 3) {
    streams {
      sequence
      type
      createdAt
      payload
    }
    lastEvaluatedKey { pk, sk, stream, streamSequence }
  }
  x: streamById(log: "users", id: "x", limit: 3) {
    streams {
      sequence
      type
      createdAt
      payload
    }
    lastEvaluatedKey { pk, sk, stream, streamSequence }
  }
  logStream(log: "users", limit: 4) {
    streams {
      sequence
      type
      id
      createdAt
      payload
    }
    lastEvaluatedKey { pk, sk, logSequence }
  }
}
```

### dynamodb tutorial

open shell with http://localhost:8000/shell

```javascript
tutorial.start()
```

add the following to gain access to the localdb

```javascript
const config = {
  endpoint: 'http://localhost:8000',
  region: ' ',
  accessKeyId: ' ',
  secretAccessKey: ' ',
  convertEmptyValues: true,
  apiVersion: '2012-08-10'
}
  
const dynamodb = new AWS.DynamoDB(config)
const docClient = new AWS.DynamoDB.DocumentClient(config)
const dynamodbStreams = new AWS.DynamoDBStreams(config)
```

# license

[Apache License, Version 2.0](LICENSE)
