-- Cria uma sequence dedicada para gerar o número da OS de forma atômica e
-- elimina a corrida do antigo COUNT(*) + 1 no PrismaWorkOrderRepository.
CREATE SEQUENCE IF NOT EXISTS work_order_number_seq START 1;

-- Em bases populadas, alinha o próximo nextval() com COUNT(*)+1 (preserva
-- numeração existente). Em base vazia, deixa a sequence intacta para que o
-- primeiro nextval() retorne 1.
SELECT setval(
  'work_order_number_seq',
  GREATEST((SELECT COUNT(*) FROM work_orders), 1),
  (SELECT COUNT(*) FROM work_orders) > 0
);
