import { generateKeyPairSync } from 'node:crypto';
import { sign } from 'jsonwebtoken';

// Par de chaves RS256 gerado em tempo de execução (nunca comitado como PEM
// literal) — usado apenas para assinar tokens de teste que simulam a Lambda
// externa (fora de escopo), tanto nos testes quanto na demonstração local
// (spec §11.3/§21.2).
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

export const CUSTOMER_JWT_TEST_PRIVATE_KEY = privateKey;
export const CUSTOMER_JWT_TEST_PUBLIC_KEY = publicKey;

export const CUSTOMER_JWT_TEST_ISSUER = 'oficina-customer-auth';
export const CUSTOMER_JWT_TEST_AUDIENCE = 'oficina-api';

/**
 * Assina um token externo de teste — substitui a Lambda (fora de escopo) nos
 * testes e na demonstração local (spec §11.3/§21.2).
 */
export function signTestCustomerToken(userId: string, expiresInSeconds = 3600): string {
  return sign({ sub: userId }, CUSTOMER_JWT_TEST_PRIVATE_KEY, {
    algorithm: 'RS256',
    issuer: CUSTOMER_JWT_TEST_ISSUER,
    audience: CUSTOMER_JWT_TEST_AUDIENCE,
    expiresIn: expiresInSeconds,
  });
}
