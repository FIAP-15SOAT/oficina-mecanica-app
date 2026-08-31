import { HttpStatus } from '@nestjs/common';

import { HealthController } from '@infrastructure/http/controllers/health/health.controller';

import {
  createMockReadinessState,
  createMockResponse,
  MockReadinessState,
  MockResponse,
} from '../../../../../helpers/health-mock.factory';

describe('HealthController', () => {
  let readiness: MockReadinessState;
  let controller: HealthController;
  let response: MockResponse;

  beforeEach(() => {
    readiness = createMockReadinessState();
    controller = new HealthController(readiness);
    response = createMockResponse();
  });

  it('should answer liveness without consulting any dependency', () => {
    expect(controller.live(response)).toEqual({ status: 'ok' });
    expect(readiness.isReady).not.toHaveBeenCalled();
    expect(response.status).not.toHaveBeenCalled();
  });

  it('should answer readiness with success when the dependency responds', async () => {
    readiness.isReady.mockResolvedValue(true);

    await expect(controller.ready(response)).resolves.toEqual({ status: 'ok' });

    expect(response.status).not.toHaveBeenCalled();
  });

  it('should answer readiness with service unavailable when the dependency does not respond', async () => {
    readiness.isReady.mockResolvedValue(false);

    await expect(controller.ready(response)).resolves.toEqual({ status: 'unavailable' });

    expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it.each([HttpStatus.OK, HttpStatus.SERVICE_UNAVAILABLE])(
    'should declare the response as non-cacheable when readiness resolves to %s',
    async (status) => {
      readiness.isReady.mockResolvedValue(status === HttpStatus.OK);

      await controller.ready(response);

      expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    },
  );

  it('should declare the liveness response as non-cacheable', () => {
    controller.live(response);

    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

  /**
   * A fronteira é por **origem**: só a indisponibilidade esperada vira `503`.
   * Um defeito no caminho de verificação propaga para o tratamento global e sai
   * `500` — converter defeito de programação em "banco indisponível" esconderia
   * a causa real exatamente no endpoint criado para diagnosticar.
   */
  it('should let an unexpected failure propagate instead of reporting unavailability', async () => {
    const defect = new TypeError('estado corrompido');

    readiness.isReady.mockRejectedValue(defect);

    await expect(controller.ready(response)).rejects.toThrow(defect);
    expect(response.status).not.toHaveBeenCalled();
  });
});
