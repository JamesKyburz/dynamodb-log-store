const { graphql } = require('graphql')
const schema = require('./schema')
const ApplicationError = require('./errors/application')
const log = require('server-base').log(__filename)
const editHtml = require('./html')

module.exports = { get, post }

function get (req, res) {
  res.setHeader('content-type', 'text/html')
  res.end(editHtml)
}

async function post (req, res) {
  const { query, variables = {}, operationName } = await req.json({
    log: false
  })
  const result = await graphql(schema, query, {}, {}, variables, operationName)
  let { errors } = result
  if (errors) {
    log.error({ query, variables, errors })
    errors = errors.filter(ApplicationError.match).map(ApplicationError.parse)
    if (!errors.length) errors = [{ message: 'Something went wrong' }]
    res.error(JSON.stringify({ errors }), 400)
  } else {
    res.json(result)
  }
}
