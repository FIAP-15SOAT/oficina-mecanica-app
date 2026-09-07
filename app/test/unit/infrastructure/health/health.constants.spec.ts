import {
  HEALTH_PATHS,
  isHealthProbePath,
  LIVENESS_PATH,
  READINESS_PATH,
} from '@infrastructure/health/health.constants';

describe('isHealthProbePath', () => {
  it('should match the exact paths exposed by the controller', () => {
    expect(isHealthProbePath(LIVENESS_PATH)).toBe(true);
    expect(isHealthProbePath(READINESS_PATH)).toBe(true);
  });

  it('should use the same closed path set the application declares', () => {
    for (const path of HEALTH_PATHS) {
      expect(isHealthProbePath(path)).toBe(true);
    }
  });

  // Comportamento preservado do supressor de access log: o router aceita a
  // barra final (`strict` é falso), mas ela nunca vem do kubelet — vem de
  // humano ou de scanner, que é justamente o tráfego que se quer enxergar.
  it('should not match a path with a trailing slash', () => {
    expect(isHealthProbePath(`${LIVENESS_PATH}/`)).toBe(false);
    expect(isHealthProbePath(`${READINESS_PATH}/`)).toBe(false);
  });

  // Um casamento por prefixo silenciaria rota vizinha futura. O conjunto
  // fechado não.
  it('should not match a neighbouring path that only shares the prefix', () => {
    expect(isHealthProbePath('/api/health/liveness')).toBe(false);
    expect(isHealthProbePath('/api/health')).toBe(false);
    expect(isHealthProbePath('/api/healthz')).toBe(false);
  });

  it('should not match a business route', () => {
    expect(isHealthProbePath('/api/work-orders')).toBe(false);
    expect(isHealthProbePath('')).toBe(false);
  });
});
