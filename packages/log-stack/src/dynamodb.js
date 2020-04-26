const DynamoDB = require('aws-sdk/clients/dynamodb')

const config = {
  endpoint: 'http://localhost:8000',
  region: ' ',
  accessKeyId: ' ',
  secretAccessKey: ' ',
  convertEmptyValues: true
}

module.exports = {
  doc: new DynamoDB.DocumentClient(config)
}
