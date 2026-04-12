import { PresentationException } from './presentation.exception';

export class InvalidInputException extends PresentationException {
  constructor(message = 'Dados de entrada inválidos') {
    super(message);
  }
}
