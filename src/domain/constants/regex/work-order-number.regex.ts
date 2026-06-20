import { WORK_ORDER_NUMBER_MIN_LENGTH } from '../validation/work-order.constants';

export const WORK_ORDER_NUMBER_REGEX = new RegExp(
  String.raw`^\d{${WORK_ORDER_NUMBER_MIN_LENGTH},}$`,
);
