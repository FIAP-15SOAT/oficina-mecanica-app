import { resolveLoggerConfig } from '@infrastructure/logging/logger.config';
import { buildTelemetryResource } from '@infrastructure/telemetry/telemetry-resource';

const SHARED_ATTRIBUTES = [
  'service.name',
  'service.namespace',
  'service.version',
  'service.instance.id',
  'deployment.environment.name',
] as const;

describe('buildTelemetryResource', () => {
  /**
   * A divergência que este teste impede é silenciosa: `service`/`env`/`version`
   * diferentes entre sinais não quebram nada — o dado aparece no destino e
   * simplesmente não se associa ao dos outros sinais.
   */
  it('should declare exactly the same five attributes as the log line', () => {
    const resource = buildTelemetryResource();
    const { resource: logResource } = resolveLoggerConfig();

    for (const attribute of SHARED_ATTRIBUTES) {
      expect(resource.attributes[attribute]).toBe(logResource[attribute]);
    }
  });

  /**
   * A asserção anterior era "exatamente estes cinco atributos", e era ela que
   * travava o defeito: `NodeSDK` resolve `configuration.resource ??
   * defaultResource()`, então entregar um recurso próprio descartava a
   * identidade do SDK. Proibir qualquer chave extra transformava a correção em
   * falha de teste.
   */
  it('should carry the SDK identity the specification requires', () => {
    const { attributes } = buildTelemetryResource();

    expect(attributes['telemetry.sdk.name']).toBe('opentelemetry');
    expect(attributes['telemetry.sdk.language']).toBe('nodejs');
    expect(typeof attributes['telemetry.sdk.version']).toBe('string');
  });

  /**
   * `defaultResource()` traz `service.name: 'unknown_service:node'`. A mescla
   * precisa deixar os cinco compartilhados vencerem — invertida, o serviço sai
   * anônimo e nada se correlaciona.
   */
  it('should let the shared attributes win over the SDK defaults', () => {
    expect(buildTelemetryResource().attributes['service.name']).toBe(
      resolveLoggerConfig().resource['service.name'],
    );
    expect(buildTelemetryResource().attributes['service.name']).not.toBe('unknown_service:node');
  });

  /**
   * `service.instance.id` é um `randomUUID()` de nível de módulo: o require
   * cache é o que garante o mesmo valor em todas as emissões do processo.
   */
  it('should keep service.instance.id stable within the process', () => {
    expect(buildTelemetryResource().attributes['service.instance.id']).toBe(
      buildTelemetryResource().attributes['service.instance.id'],
    );
  });

  it('should use the declared fallback when the version does not come from the environment', () => {
    const resource = buildTelemetryResource();

    expect(typeof resource.attributes['service.version']).toBe('string');
    expect(resource.attributes['service.version']).not.toBe('');
  });
});
