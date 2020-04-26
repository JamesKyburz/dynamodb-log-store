const ApplicationError = require('./errors/application')
const { v4: uuid } = require('uuid')
const dynamodb = require('./dynamodb')

module.exports = { logList, streamById, logStream, append }

async function logList ({ limit = 1000, exclusiveStartKey, selection }) {
  const projectionMap = getProjectionMap(selection, {
    name: 'sk',
    lastSequence: 'logSequence'
  })

  const {
    Items: items = [],
    LastEvaluatedKey: lastEvaluatedKey
  } = await dynamodb.doc
    .query({
      TableName: 'logs',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: { '#pk': 'pk', ...projectionMap },
      ExpressionAttributeValues: { ':pk': 'log-sequence' },
      ProjectionExpression: projectionMap
        ? Object.keys(projectionMap).join(', ')
        : undefined,
      ExclusiveStartKey: exclusiveStartKey,
      Limit: limit
    })
    .promise()

  const logs = []

  for (const { sk: name, logSequence: lastSequence } of items) {
    logs.push({ name, lastSequence })
  }

  return {
    logs,
    lastEvaluatedKey
  }
}

async function append ({ log, type, id, payload = {} }) {
  if (!id) id = uuid()
  if (!type) throw new ApplicationError('type must be specified')
  if (!log) throw new ApplicationError('log must be specified')
  if (typeof payload !== 'object') {
    throw new ApplicationError('payload is not json')
  }

  const createdAt = Date.now()
  const {
    Attributes: { logSequence }
  } = await dynamodb.doc
    .update({
      TableName: 'logs',
      Key: { pk: 'log-sequence', sk: log },
      UpdateExpression: 'ADD logSequence :incr',
      ExpressionAttributeValues: { ':incr': 1 },
      ReturnValues: 'UPDATED_NEW'
    })
    .promise()
  const {
    Attributes: { streamSequence }
  } = await dynamodb.doc
    .update({
      TableName: 'logs',
      Key: { pk: `stream-sequence#${log}#${id}`, sk: 'sequence' },
      UpdateExpression: 'ADD streamSequence :incr',
      ExpressionAttributeValues: { ':incr': 1 },
      ReturnValues: 'UPDATED_NEW'
    })
    .promise()

  try {
    await dynamodb.doc
      .put({
        TableName: 'logs',
        Item: {
          pk: `${log}#stream`,
          sk: `stream#${id}#${streamSequence}`,
          stream: `stream#${log}#${id}`,
          logSequence,
          streamSequence,
          type,
          createdAt,
          id,
          payload
        },
        ConditionExpression: 'attribute_not_exists(sk)'
      })
      .promise()
  } catch (err) {
    if (err.code === 'ConditionalCheckFailedException') {
      throw new ApplicationError('key is writed-locked')
    } else {
      throw err
    }
  }
  return id
}

async function streamById ({
  log,
  id,
  reverse,
  limit = 1000,
  exclusiveStartKey,
  selection
}) {
  const projectionMap = getProjectionMap(selection, {
    sequence: 'streamSequence'
  })

  const {
    Items: items = [],
    LastEvaluatedKey: lastEvaluatedKey
  } = await dynamodb.doc
    .query({
      TableName: 'logs',
      IndexName: 'stream',
      KeyConditionExpression: '#stream = :stream',
      ExpressionAttributeNames: { '#stream': 'stream', ...projectionMap },
      ExpressionAttributeValues: { ':stream': `stream#${log}#${id}` },
      ProjectionExpression: projectionMap
        ? Object.keys(projectionMap).join(', ')
        : undefined,
      ExclusiveStartKey: exclusiveStartKey,
      ScanIndexForward: !reverse,
      Limit: limit
    })
    .promise()

  const streams = []
  for (const { type, streamSequence: sequence, createdAt, payload } of items) {
    streams.push({
      type,
      sequence,
      createdAt,
      ...(payload && { payload: JSON.stringify(payload) })
    })
  }

  return {
    streams,
    lastEvaluatedKey
  }
}

async function logStream ({
  log,
  reverse,
  limit = 1000,
  exclusiveStartKey,
  selection
}) {
  const projectionMap = getProjectionMap(selection, {
    sequence: 'logSequence'
  })

  const {
    Items: items = [],
    LastEvaluatedKey: lastEvaluatedKey
  } = await dynamodb.doc
    .query({
      TableName: 'logs',
      IndexName: 'log',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: { '#pk': 'pk', ...projectionMap },
      ExpressionAttributeValues: { ':pk': `${log}#stream` },
      ProjectionExpression: projectionMap
        ? Object.keys(projectionMap).join(', ')
        : undefined,
      ScanIndexForward: !reverse,
      ExclusiveStartKey: exclusiveStartKey,
      Limit: limit
    })
    .promise()

  const streams = []
  for (const { type, id, logSequence: sequence, createdAt, payload } of items) {
    streams.push({
      type,
      sequence,
      createdAt,
      id,
      ...(payload && { payload: JSON.stringify(payload) })
    })
  }

  return {
    streams,
    lastEvaluatedKey
  }
}

function getProjectionMap (selection, map) {
  if (!selection) return
  return selection.reduce((sum, name) => {
    const value = map[name] || name
    const key = `#${value}`
    sum[key] = value
    return sum
  }, {})
}
