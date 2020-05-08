module.exports = `
  type Query {
    # List all logs, default limit is 1000, use cursor for pagination.
    logList(limit: Float, cursor: String): LogListResult!
    # List all events by id for a given log, default limit is 1000, use cursor for pagination.
    streamById(log: String!, id: String!, reverse: Boolean, limit: Float, cursor: String): StreamResult!
    # List all events for a given log, default limit is 1000, use cursor for pagination.
    logStream(log: String!, reverse: Boolean, limit: Float, cursor: String): LogStreamResult!
  }
  type Mutation {
    # Append new event to log, jsonBody must be valid JSON stringified.
    append(log: String!, type: String!, id: String, jsonBody: String): String!
  }
  # LogList.
  type LogListResult {
    # List of logs.
    logs: [Log]!
    # Last evaluated key, if this is null then no more records exist.
    cursor: String
  }
  # Log.
  type Log {
    name: String!
    sequence: String!
  }
  # Stream result.
  type StreamResult {
    # List of streams
    streams: [StreamEvent]!
    # Last evaluated key, if this is null then no more records exist.
    cursor: String
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
    sequence: String!
  }
  # LogStream result.
  type LogStreamResult {
    # List of streams
    streams: [LogEvent]!
    # Last evaluated cursor, if this is null then no more records exist.
    cursor: String
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
    sequence: String!
  }
`
