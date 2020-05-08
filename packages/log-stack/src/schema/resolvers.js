const client = require('../client')

module.exports = {
  Query: { logList, streamById, logStream },
  Mutation: { append }
}

async function append (root, args, ast) {
  if (args.jsonBody) {
    args.payload = JSON.parse(args.jsonBody)
    delete args.jsonBody
  }
  return client.append(args)
}

async function logList (root, args, context, ast) {
  return client.logList({
    ...args,
    selection: getSelection(getField(ast, 'logs'))
  })
}

async function streamById (root, args, context, ast) {
  return client.streamById({
    ...args,
    selection: getSelection(getField(ast, 'streams'))
  })
}

async function logStream (root, args, context, ast) {
  return client.logStream({
    ...args,
    selection: getSelection(getField(ast, 'streams'))
  })
}

function getSelection (ast) {
  if (!ast) return
  if (ast.fieldNodes) ast = ast.fieldNodes[0]
  return ast.selectionSet.selections.reduce(
    (sum, item) => [...sum, item.name.value],
    []
  )
}

function getField (ast, field) {
  return ast.fieldNodes[0].selectionSet.selections.find(
    x => x.name.value === field
  )
}
