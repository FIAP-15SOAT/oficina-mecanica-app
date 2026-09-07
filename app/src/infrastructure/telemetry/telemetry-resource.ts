import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import type { Resource } from '@opentelemetry/resources';

import { resolveLoggerConfig } from '@infrastructure/logging/logger.config';

/**
 * Origem única dos atributos de recurso: os cinco que identificam o serviço —
 * nome, namespace, versão, instância e ambiente — vêm da **mesma** resolução
 * que o log usa, e portanto são idênticos entre log, trace e métrica por
 * construção, não por convenção.
 *
 * ⚠️ O `defaultResource()` é a base, e não um detalhe: o `NodeSDK` resolve o
 * recurso como `configuration.resource ?? defaultResource()`, então **passar um
 * recurso próprio descarta o padrão inteiro** — e com ele `telemetry.sdk.name`,
 * `telemetry.sdk.language` e `telemetry.sdk.version`, que a especificação exige
 * e que identificam qual SDK produziu o dado. Medido: sem esta mescla os três
 * não saem em span nem em métrica.
 *
 * A ordem importa. `merge()` faz o **argumento vencer** a colisão, então os
 * cinco compartilhados sobrescrevem o `service.name: 'unknown_service:node'`
 * que o padrão traz. Inverter os lados devolveria o serviço anônimo.
 */
export function buildTelemetryResource(): Resource {
  return defaultResource().merge(resourceFromAttributes({ ...resolveLoggerConfig().resource }));
}
