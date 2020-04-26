module.exports = `
  type Query {
    # List all logs, default limit is 1000, use exclusiveStartKey for pagination.
    logList(limit: Float, exclusiveStartKey: ExclusiveStartLogKey): LogListResult!
    # List all events by id for a given log, default limit is 1000, use exclusiveStartKey for pagination.
    streamById(log: String!, id: String!, reverse: Boolean, limit: Float, exclusiveStartKey: ExclusiveStartStreamEventKey): StreamResult!
    # List all events for a given log, default limit is 1000, use exclusiveStartKey for pagination.
    logStream(log: String!, reverse: Boolean, limit: Float, exclusiveStartKey: ExclusiveStartLogEventKey): LogStreamResult!
  }
  type Mutation {
    # Append new event to log, jsonBody must be valid JSON stringified.
    append(log: String!, type: String!, id: String, jsonBody: String!): String!
  }
  # LogList.
  type LogListResult {
    # List of logs.
    logs: [Log]!
    #  Last evaluated log key, if this is null then no more records exist.
    lastEvaluatedKey: LastEvaluatedLogKey
  }
  # Log.
  type Log {
    name: String!
    lastSequence: Float!
  }
  # Last evaluated log key, if this is null then no more records exist.
  type LastEvaluatedLogKey {
    # Partition key
    sk: String!
    # Sort key
    pk: String!
  }
  # Exclusive start log key, the value of lastEvaluatedKey.
  input ExclusiveStartLogKey {
    # Partition key
    sk: String!
    # Sort key
    pk: String!
  }
  # Stream result.
  type StreamResult {
    #  List of streams
    streams: [StreamEvent]!
    #  Last evaluated log key, if this is null then no more records exist.
    lastEvaluatedKey: LastEvaluatedStreamEventKey
  }
  # Stream event.
  type StreamEvent {
    # Type of event.
    type: String!
    # epoch event was created.
    createdAt: String!
    # JSON stringified event payload.
    payload: String!
    # unique sequence for stream in this log.
    sequence: Float!
  }
  # Last evaluated stream event key, if this is null then no more records exist.
  type LastEvaluatedStreamEventKey {
    # Partition key
    sk: String!
    # Sort key
    pk: String!
    # stream sequence starting at 1
    streamSequence: Float!
    # stream key
    stream: String!
  }
  # Exclusive start stream event key, the value of lastEvaluatedKey.
  input ExclusiveStartStreamEventKey {
    # Partition key
    sk: String!
    # Sort key
    pk: String!
    # stream sequence starting at 1
    streamSequence: Float!
    # stream key
    stream: String!
  }
  # LogStream result.
  type LogStreamResult {
    # List of streams
    streams: [LogEvent]!
    # Last evaluated log key, if this is null then no more records exist.
    lastEvaluatedKey: LastEvaluatedLogEventKey
  }
  # Log event.
  type LogEvent {
    # Unique id of a stream in a log.
    id: String!
    # Type of event.
    type: String!
    # epoch event was created.
    createdAt: String!
    # JSON stringified event payload.
    payload: String!
    # unique sequence for this log.
    sequence: Float!
  }
  # Last evaluated log event key, if this is null then no more records exist.
  type LastEvaluatedLogEventKey {
    # Partition key
    sk: String!
    # Sort key
    pk: String!
    # log sequence starting at 1
    logSequence: Float!
  }
  # Exclusive start log event key, the value of lastEvaluatedKey.
  input ExclusiveStartLogEventKey {
    # Partition key
    sk: String!
    # Sort key
    pk: String!
    # log sequence starting at 1
    logSequence: Float!
  }
`
