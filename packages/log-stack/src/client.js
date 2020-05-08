const ApplicationError = require('./errors/application')
const { v4: uuid } = require('uuid')
const dynamodb = require('./dynamodb')
const ulid = require('./ulid')

module.exports = { logList, streamById, logStream, append }

async function logList ({ limit = 1000, cursor, selection }) {
  const projectionMap = getProjectionMap(selection, { name: 'logName' })

  const {
    Items: items = [],
    LastEvaluatedKey: lastEvaluatedKey
  } = await dynamodb.doc
    .query({
      TableName: 'logs',
      IndexName: 'log',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: { ...projectionMap },
      ExpressionAttributeValues: { ':pk': 'logname' },
      ProjectionExpression: projectionMap
        ? Object.keys(projectionMap).join(', ')
        : undefined,
      ExclusiveStartKey: parseCursor(cursor),
      Limit: limit
    })
    .promise()

  const result = {}

  for (const { logName: name, sequence } of items) {
    if (result[name]) {
      if (sequence > result[name]) {
        result[name] = sequence
      }
    } else {
      result[name] = sequence
    }
  }

  const logs = []

  for (const [name, sequence] of Object.entries(result)) {
    logs.push({ name, sequence })
  }

  return {
    logs,
    cursor: stringifyCursor(
      lastEvaluatedKey || lastEvaluatedItemKey(logs, ['pk', 'sk', 'logName'])
    )
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
      }
    })
    .promise()

  return id
}

async function streamById ({
  log,
  id,
  reverse,
  limit = 1000,
  cursor,
  selection
}) {
  const projectionMap = getProjectionMap(selection)

  const {
    Items: items = [],
    LastEvaluatedKey: lastEvaluatedKey
  } = await dynamodb.doc
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
      ProjectionExpression: projectionMap
        ? Object.keys(projectionMap).join(', ')
        : undefined,
      ExclusiveStartKey: parseCursor(cursor),
      ScanIndexForward: !reverse,
      Limit: limit
    })
    .promise()

  const streams = []
  for (const { type, sequence, createdAt, payload } of items) {
    streams.push({
      type,
      sequence,
      createdAt,
      ...(payload && { payload: JSON.stringify(payload) })
    })
  }

  return {
    streams,
    cursor: stringifyCursor(
      lastEvaluatedKey ||
        lastEvaluatedItemKey(streams, ['pk', 'sk', 'stream', 'sequence'])
    )
  }
}

async function logStream ({ log, reverse, limit = 1000, cursor, selection }) {
  const projectionMap = getProjectionMap(selection)

  const {
    Items: items = [],
    LastEvaluatedKey: lastEvaluatedKey
  } = await dynamodb.doc
    .query({
      TableName: 'logs',
      IndexName: 'logStream',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: { '#pk': 'pk', ...projectionMap },
      ExpressionAttributeValues: { ':pk': `event#${log}#stream` },
      ProjectionExpression: projectionMap
        ? Object.keys(projectionMap).join(', ')
        : undefined,
      ScanIndexForward: !reverse,
      ExclusiveStartKey: parseCursor(cursor),
      Limit: limit
    })
    .promise()

  const streams = []
  for (const { type, id, sequence, createdAt, payload } of items) {
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
    cursor: stringifyCursor(
      lastEvaluatedKey ||
        lastEvaluatedItemKey(streams, ['pk', 'sk', 'sequence'])
    )
  }
}

function parseCursor (cursor) {
  if (cursor) {
    return JSON.parse(Buffer.from(cursor, 'base64'))
  }
}

function lastEvaluatedItemKey (items, keys) {
  if (items.length) {
    const last = items.slice(-1)[0]
    return keys.reduce((sum, key) => {
      sum[key] = last[key]
      return sum
    }, {})
  }
}

function stringifyCursor (cursor) {
  if (cursor) {
    return Buffer.from(JSON.stringify(cursor)).toString('base64')
  }
}

function getProjectionMap (selection, map = {}) {
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
      '#sk': 'sk'
    }
  )
}

function randomBetween (a, b) {
  return Math.floor(Math.random() * (b - a + 1) + a)
}
