const ApplicationError = require('./errors/application')
const { v4: uuid } = require('uuid')
const dynamodb = require('./dynamodb')
const ulid = require('./ulid')

module.exports = { logList, streamById, logStream, append }

async function logList ({ limit = 1000, cursor, returnCursor, selection }) {
  const projectionMap = getProjectionMap({
    selection,
    map: { name: 'logName' },
    add: {
      '#logName': 'logName'
    }
  })

  const { Items: items = [] } = await dynamodb.doc
    .query({
      TableName: 'logs',
      IndexName: 'log',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: projectionMap,
      ExpressionAttributeValues: { ':pk': 'logname' },
      ProjectionExpression: projectionExpression(projectionMap),
      ExclusiveStartKey: parseCursor(cursor),
      Limit: limit * 25
    })
    .promise()

  const result = {}

  for (const { logName: name, sequence, pk, sk } of items) {
    if (result[name]) {
      if (sequence > result[name].sequence) {
        result[name] = { pk, sk, sequence }
      }
    } else {
      result[name] = { pk, sk, sequence }
    }
  }

  const logs = []

  for (const [key, value] of Object.entries(result)) {
    logs.push({ name: key, logName: key, ...value })
    if (logs.length === limit) break
  }

  const lastEvaluatedItem =
    returnCursor && getLastEvaluatedItem(logs, ['logName'])

  if (lastEvaluatedItem) {
    // To prevent the same logName being returned because of the random sk suffix.
    lastEvaluatedItem.logName += '\x00'
  }

  return {
    logs,
    cursor: stringifyCursor(lastEvaluatedItem)
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
  const sequence = await ulid()

  await dynamodb.doc
    .put({
      TableName: 'logs',
      Item: {
        pk: 'logname',
        sk: `logname#${log}#${randomBetween(0, 25)}`,
        logName: log,
        sequence
      }
    })
    .promise()

  try {
    await dynamodb.doc
      .put({
        TableName: 'logs',
        Item: {
          pk: `event#${log}#stream`,
          sk: `stream#${id}#${sequence}`,
          stream: `stream#${id}`,
          sequence,
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
      throw new ApplicationError('key already exists')
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
  cursor,
  returnCursor,
  selection
}) {
  const projectionMap = getProjectionMap({
    selection,
    add: {
      '#stream': 'stream',
      '#sequence': 'sequence'
    }
  })

  const { Items: items = [] } = await dynamodb.doc
    .query({
      TableName: 'logs',
      IndexName: 'streamById',
      KeyConditionExpression: '#stream = :stream',
      ExpressionAttributeNames: {
        '#stream': ':stream',
        ...projectionMap
      },
      ExpressionAttributeValues: {
        ':stream': `stream#${id}`
      },
      ProjectionExpression: projectionExpression(projectionMap),
      ExclusiveStartKey: parseCursor(cursor),
      ScanIndexForward: !reverse,
      Limit: limit
    })
    .promise()

  const streams = []
  for (const { pk, sk, stream, type, sequence, createdAt, payload } of items) {
    streams.push({
      type,
      pk,
      sk,
      stream,
      sequence,
      createdAt,
      ...(payload && { payload: JSON.stringify(payload) })
    })
  }

  const lastEvaluatedItem =
    returnCursor && getLastEvaluatedItem(streams, ['stream', 'sequence'])

  return {
    streams,
    cursor: stringifyCursor(lastEvaluatedItem)
  }
}

async function logStream ({
  log,
  reverse,
  limit = 1000,
  cursor,
  returnCursor,
  selection
}) {
  const projectionMap = getProjectionMap({
    selection,
    add: {
      '#sequence': 'sequence'
    }
  })

  const { Items: items = [] } = await dynamodb.doc
    .query({
      TableName: 'logs',
      IndexName: 'logStream',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: { '#pk': 'pk', ...projectionMap },
      ExpressionAttributeValues: { ':pk': `event#${log}#stream` },
      ProjectionExpression: projectionExpression(projectionMap),
      ScanIndexForward: !reverse,
      ExclusiveStartKey: parseCursor(cursor),
      Limit: limit
    })
    .promise()

  const streams = []
  for (const { pk, sk, type, id, sequence, createdAt, payload } of items) {
    streams.push({
      pk,
      sk,
      type,
      sequence,
      createdAt,
      id,
      ...(payload && { payload: JSON.stringify(payload) })
    })
  }

  const lastEvaluatedItem =
    returnCursor && getLastEvaluatedItem(streams, ['sequence'])

  return {
    streams,
    cursor: stringifyCursor(lastEvaluatedItem)
  }
}

function parseCursor (cursor) {
  if (cursor) {
    return JSON.parse(Buffer.from(cursor, 'base64'))
  }
}

function stringifyCursor (cursor) {
  if (cursor) {
    return Buffer.from(JSON.stringify(cursor)).toString('base64')
  }
}

function projectionExpression (projectionMap) {
  if (projectionMap) {
    return Object.keys(projectionMap).join(', ')
  }
}

function getLastEvaluatedItem (items, keys) {
  if (items.length) {
    const lastItem = items[items.length - 1]
    return ['pk', 'sk'].concat(keys).reduce((sum, key) => {
      sum[key] = lastItem[key]
      return sum
    }, {})
  }
}

function getProjectionMap ({ selection, map = {}, add }) {
  if (!selection) return
  return selection.reduce(
    (sum, name) => {
      const value = map[name] || name
      const key = `#${value}`
      sum[key] = value
      return sum
    },
    {
      '#pk': 'pk',
      '#sk': 'sk',
      ...add
    }
  )
}

function randomBetween (a, b) {
  return Math.floor(Math.random() * (b - a + 1) + a)
}
