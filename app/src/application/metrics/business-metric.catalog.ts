import { defineBusinessMetric } from './business-metric';

export const BUSINESS_METRICS = {
  WORK_ORDER_CREATED: defineBusinessMetric<Record<never, never>>({
    name: 'work_order.created',
    kind: 'counter',
    unit: '{work_order}',
    description: 'Ordens de serviço criadas e confirmadas em transação',
  }),
  WORK_ORDER_STATUS_DURATION: defineBusinessMetric<{ workOrderStatus: string }>({
    name: 'work_order.status.duration',
    kind: 'histogram',
    unit: 's',
    description: 'Tempo de permanência da ordem de serviço em cada status',
  }),
  WORK_ORDER_DIAGNOSIS_TO_COMPLETION_DURATION: defineBusinessMetric<Record<never, never>>({
    name: 'work_order.diagnosis_to_completion.duration',
    kind: 'histogram',
    unit: 's',
    description: 'Tempo total entre a entrada em diagnóstico e a conclusão, esperas incluídas',
  }),
  WORK_ORDER_LEAD_TIME_DURATION: defineBusinessMetric<Record<never, never>>({
    name: 'work_order.lead_time.duration',
    kind: 'histogram',
    unit: 's',
    description: 'Tempo total entre o recebimento e a entrega da ordem de serviço',
  }),
} as const;
