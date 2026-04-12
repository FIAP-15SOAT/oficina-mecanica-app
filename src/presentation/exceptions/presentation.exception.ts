export abstract class PresentationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
