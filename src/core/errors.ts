export class ValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PersistenceError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PersistenceError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
