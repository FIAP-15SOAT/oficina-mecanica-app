// Hash bcrypt válido de um valor arbitrário. Não é secreto: existe apenas para que
// `hashService.compare` sempre execute um trabalho real quando o identificador não é
// encontrado, evitando que esse caminho seja mensuravelmente mais rápido que o de
// "senha incorreta" (timing side-channel). Não protege nenhuma conta real — pode ficar
// em código-fonte com segurança.
export const DUMMY_PASSWORD_HASH = '$2b$12$PeogSPQuXXcQZWevnZMD7u5zikjQc626ibxG0hUlt7AuCb9vXvuBK';
