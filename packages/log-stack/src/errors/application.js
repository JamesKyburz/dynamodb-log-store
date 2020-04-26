const prefix = '<<__<<application-error>>__>>'
module.exports = class ApplicationError extends Error {
  constructor (message, properties) {
    if (typeof message === 'object') {
      properties = message
      message = undefined
    }
    super(message)
    this.message = ApplicationError.createErrorMessage({
      message,
      ...properties
    })
    Error.captureStackTrace(this, ApplicationError)
  }

  static createErrorMessage (error) {
    return prefix + JSON.stringify(error)
  }

  static match (error) {
    return error.message.includes(prefix)
  }

  static parse (error) {
    return JSON.parse((error.message || '').split(prefix)[1])
  }
}
