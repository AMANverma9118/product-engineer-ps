export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

export class MongoUnavailableError extends Error {
  constructor(message = "MongoDB is unavailable") {
    super(message);
    this.name = "MongoUnavailableError";
  }
}
