const graphql = require('./graphql')
const middleware = require('./middleware')

require('server-base')({
  '@setup': middleware,
  '/graphql*': graphql
}).start()
