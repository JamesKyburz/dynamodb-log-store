module.exports = require('graphql-tools').makeExecutableSchema({
  typeDefs: require('./typedefs'),
  resolvers: require('./resolvers')
})
