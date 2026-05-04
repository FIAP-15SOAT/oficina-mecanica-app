Preciso implementar todas as funcionalidades referente a ordem de serviço. Atue como um engenheiro de software sênior, seguindo as melhores práticas e clean code.

Antes de listar as funcionalidades, preciso te passar uma alteração para ser feita na modelagem do Prisma:

# Alteração da modelagem do Prisma

- Crie as models QuoteService e QuotePart e ajuste a model Quote para atender essa estrutura:

```
model Quote {
  id             String      @id @default(uuid()) @db.Uuid
  workOrderId    String      @map("work_order_id") @db.Uuid
  servicesAmount Decimal     @default(0) @map("services_amount") @db.Decimal(10, 2)
  partsAmount    Decimal     @default(0) @map("parts_amount") @db.Decimal(10, 2)
  totalAmount    Decimal     @default(0) @map("total_amount") @db.Decimal(10, 2)
  status         QuoteStatus @default(PENDING)
  notes          String?     @db.Text
  sentAt         DateTime?   @map("sent_at")
  approvedAt     DateTime?   @map("approved_at")
  rejectedAt     DateTime?   @map("rejected_at")
  createdAt      DateTime    @default(now()) @map("created_at")
  updatedAt      DateTime    @default(now()) @updatedAt @map("updated_at")

  workOrder WorkOrder      @relation(fields: [workOrderId], references: [id])
  services  QuoteService[] // <-- NOVA RELAÇÃO
  parts     QuotePart[]    // <-- NOVA RELAÇÃO

  @@map("quotes")
}

model QuoteService {
  quoteId     String   @map("quote_id") @db.Uuid
  serviceId   String   @map("service_id") @db.Uuid
  quantity    Int      @default(1)
  unitPrice   Decimal  @map("unit_price") @db.Decimal(10, 2)
  totalPrice  Decimal  @map("total_price") @db.Decimal(10, 2)
  createdAt   DateTime @default(now()) @map("created_at")

  quote   Quote   @relation(fields: [quoteId], references: [id])
  service Service @relation(fields: [serviceId], references: [id])

  // Define a chave primária composta
  @@id([quoteId, serviceId])
  @@map("quote_services")
}

model QuotePart {
  quoteId       String   @map("quote_id") @db.Uuid
  partSupplyId  String   @map("part_supply_id") @db.Uuid
  quantity      Int      @default(1)
  unitPrice     Decimal  @map("unit_price") @db.Decimal(10, 2)
  totalPrice    Decimal  @map("total_price") @db.Decimal(10, 2)
  createdAt     DateTime @default(now()) @map("created_at")

  quote      Quote      @relation(fields: [quoteId], references: [id])
  partSupply PartSupply @relation(fields: [partSupplyId], references: [id])

  // Define a chave primária composta
  @@id([quoteId, partSupplyId])
  @@map("quote_parts")
}
```

- Crie também essa nova tabela:

```
model StockReservation {
  id            String   @id @default(uuid()) @db.Uuid
  partSupplyId  String   @map("part_supply_id") @db.Uuid
  workOrderId   String   @map("work_order_id") @db.Uuid
  quantity      Int
  createdAt     DateTime @default(now()) @map("created_at")

  partSupply PartSupply @relation(fields: [partSupplyId], references: [id])
  workOrder  WorkOrder  @relation(fields: [workOrderId], references: [id])

  @@map("stock_reservations")
}
```

- Adicione esse campo em PartSupply:

```
reservedStock Int @default(0) @map("reserved_stock")
```

- Altere o nome da model WorkOrderPart para WorkOrderPartSupply

Observação: ele não deve ser exigido nas request de CRUD de PartSupply, é apenas um controle interno feito pelo próprio sistema.

- Execute o generate do Prisma e crie a migration para essas alterações

# Funcionalidades

As funcionalidades que devem ser implementadas estão listadas abaixo:

## Cadastrar ordem de serviço (POST /work-orders)

- Campos a serem cadastrados no cadastro: ID (gerar UUID automaticamente pelo sistema), number (gerar número sequencial), customerId, vehicleId, status (iniciar com RECEIVED automáticamente), problemDescription (opcional), internalNotes (opcional), mileageAtService (opcional).

### Regras

- Validar existência do cliente e do veículo
- createdAt e updatedAt devem ser inseridos automaticamente com a data/hora atual pelo sistema e não devem ser exigidos no request body
- id e number também devem ser gerados automaticamente pelo sistema e não devem ser exigidos no request body
- o totalAmount deve ser criado como 0 por padrão
- Criar também o registro na tabela StatusHistory (o campo changedById deve ser inserido com base no ID do usuário autenticado. O campo notes deve ser "Criação da Ordem de Serviço").

## Editar a ordem de serviço (PUT /work-orders/:id)

- Campos a serem editados: problemDescription (opcional), internalNotes (opcional), mileageAtService (opcional), updatedAt e assignedUserId.

### Regras

- Validar existência do cliente e do veículo
- updatedAt deve ser atualizado automaticamente coma data/hora atual pelo sistema e não devem ser exigidos no request body
- Se os campos opcionais não estavam com valor antes e agoram foram informados, isso deve refletir na atualização. Da mesma forma se antes eles existiam e agora não foram informados, eles devem ser removidos.
- A ordem de serviço só pode ser atualizada se estiver no status RECEIVED e IN_DIAGNOSIS
- Criar também o registro na tabela StatusHistory (o campo changedById deve ser inserido com base no ID do usuário autenticado. O campo notes deve ser "Atualização da Ordem de Serviço")

Observação: O campo do status só vai poder ser alterado em um endpoint PATCH.

## Listar as ordens de serviço (GET /work-orders)

- A lista de ordens de serviço deve trazer os seguintes campos, além dos campos de paginação: id, number, customer (id, name, type, document, email, phone), vehicle (id, plate, brand, model, year, color, mileage), assignedUser (id, name, email, role), status, totalAmout, approvedAt, startedAt, finishedAt, deliveredAt, createdAt, updatedAt.

### Regras

- As ordens de serviço podem ser filtradas pelos seguintes campos: number, customerId, vehicleId, assignedUserId e status, além dos campos de paginação (page e limit)

- Ordene sempre da mais recente pela data de criação (createdAt) para a mais antiga

## Consultar ordem de serviço por ID (GET /work-orders/:id)

- Deve trazer os seguintes campos: id, number, customer (id, name, type, document, phone, email), vehicle (id, plate, brand, model, year, color), assignedUser (id, name, email, role), status, problemDescription, internalNotes, mileageAtService, totalAmout, approvedAt, startedAt, finishedAt, deliveredAt, createdAt, updatedAt, lista de services associados(serviceId, name, description, quantity, unitPrice, totalPrice, status, startedAt, finishedAt, createdAt, updatedAt), lista de partSupplies (partSupplyId, name, description, sku, partNumber, category, unit, quantity, unitPrice, totalPrice)

## Atualizar status da ordem de serviço (PATCH /work-orders/:id)

- Campos recebidos: status e notes (para usar na SatusHistory)

### Regras:

- A ordem de serviço só pode ser atualizada para esses status nesse endpoint: IN_DIAGNOSIS, CANCELLED e DELIVERED. Todos os outros status são atualizados com base em outras ações no sistema.

- O campo notes é opcional e só deve ser exigido para alterações para o status CANCELLED.

- Se a ordem de serviço estiver com o status CANCELLED ou DELIVERED, o status não pode ser atualizado.

- Não permitir atualizar novamente o status se já estiver naquele status

Observação: O status CANCELLED não existe ainda, então faça essa alteração no schema do Prisma, faça o generate e crie a migration.

#### Regras de domínio da atualização de status:

- Se a ordem de serviço estiver no status RECEIVED, ela só pode ser alterada para o status CANCELED (Esse status ainda não está definido no model do Prisma, então também precisa fazer essa alteração e rodar o generate e a migration do Prisma)

- Se o status da ordem de serviço for atualizado para APPROVED, atualizar o campo approvedAt. A ordem de serviço só pode ser atualizada para esse status se estiver no status AWAITING_APPROVAL.

- Se o status da ordem de serviço for atualizado para COMPLETED, atualizar o campo startedAt. A ordem de serviço só pode ser atualizada para esse status se estiver no status "IN_PROGRESS"

- Se o status da ordem de serviço for atualizado para IN_PROGRESS, atualizar o campo startedAt.  A ordem de serviço só pode ser atualizada para esse status se estiver no status "APPROVED"

- Se o status da ordem de serviço for atualizado para DELIVERED, atualizar o campo deliveredAt. A ordem de serviço só pode ser atualizada para esse status se estiver no status "COMPLETED"

- ATENÇÃO: Todas as atualizações de status devem ser registradas na StatusHistory. O campo notes é opcional e deve ser exigido apenas se o status for CANCELLED, para inserir na StatusHistory.

Observação: O status APPROVED não existe ainda, então faça essa alteração no schema do Prisma, faça o generate e crie a migration.

## Criação de orçamento para a ordem de serviço (POST /work-orders/:id/quotes)

- Campos a serem informados: notes (opcional), services (array opcional com id e quantity) e partSupplies (array opcional com id e quantity)

### Regras

- Como os campos da request são todos opcionais, a request pode ser feita sem payload ou com um payload vazio
- O Quote deve ser criado com o status PENDING por padrão
- Caso os services e/ou partSupplies sejam informados, a aplicação deve: criar os registros de QuoteService e QuotePartSupply, onde o unitPrice deve ser carregado da entidade de origem (Service e PartSupply) com seu basePrice atual e o totalPrice deve ser calculado com base na quantidade * unitPrice. Também deve ser calculado o servicesAmount, partSuppliesAmount e totalAmount.
- O createdAt e updatedAt devem ser inseridos com a data/hora atual automaticamente pelo sistema
- Só é possível criar orçamento caso a ordem de serviço esteja no status IN_DIAGNOSIS ou WAITING_APPROVAL.
- Validar a existência da ordem de serviço

## Listar orçamentos da ordem de serviço (GET /work-orders/:id/quotes)

- Campos a serem retornados: todos

### Regras:

- Filtros: padrões de paginação (page e limit) e status
- Ordenação: pelo createdAt de forma decrescente (do mais recente para o mais antigo)

## Obter orçamento da ordem (GET /quotes/:id/quotes)

- Campos retornados: todos

## Adicionar serviço no orçamento (POST /quotes/:id/quoteId/services)

- Campos recebidos na request: serviceId e quantity

### Regras

- Recalcular e atualizar totais (servicesAmount e totalAmout). Não esquecer de considerar o partsAmount para o cálculo do totalAmout

- Atualizar o updatedAt do Quote e do QuoteService com a data/hora atual

- Só é possível adicionar caso o orçamento esteja no status PENDING

## Atualizar quantidade do serviço no orçamento (PATCH /quotes/:quoteId/services/:serviceId)

- Campos recebidos na request: quantity

### Regras

- Recalcular e atualizar totais (servicesAmount e totalAmout). Não esquecer de considerar o partsAmount para o cálculo do totalAmout

- Atualizar o updatedAt do Quote e do QuoteService com a data/hora atual

- Só é possível atualizar caso o orçamento esteja no status PENDING

## Remover serviço do orçamento (DELETE /quotes/:id/quote)

### Regras

- Só é possível remover caso o orçamento esteja no status PENDING
- Atualizar o updatedAt do Quote e do QuoteService com a data/hora atual

## Adicionar peça/insumo no orçamento (POST /quotes/:id/part-supplies/partSupplyId)

- Campos recebidos na request: partSupplyId e quantity

### Regras

- Recalcular e atualizar totais (partSuppliesAmount e totalAmout). Não esquecer de considerar o servicesAmount para o cálculo do totalAmout

- Atualizar o updatedAt do Quote e do QuotePartSupply com a data/hora atual

- Só é possível adicionar caso o orçamento esteja no status PENDING

- Se o estoque estiver insuficiente (com base na quantity de PartSupply - reservedStock), lançar erro

## Atualizar quantidade da peça/insumo no orçamento (PATCH /quotes/:quoteId/services/:serviceId)

- Campos recebidos na request: quantity

### Regras

- Recalcular e atualizar totais (partSuppliesAmount e totalAmout). Não esquecer de considerar o servicesAmount para o cálculo do totalAmout

- Atualizar o updatedAt do Quote e do QuotePartSupply com a data/hora atual

- Só é possível atualizar caso o orçamento esteja no status PENDING

- Se o estoque estiver insuficiente (com base na quantity - reservedStock), lançar erro

## Remover peça/insumo do orçamento (DELETE /quotes/:quoteId/part-supply/:partSupplyId)

### Regras

- Só é possível remover caso o orçamento esteja no status PENDING
- Atualizar o updatedAt do Quote e do QuotePartSupplyService com a data/hora atual

## Alterar status do orçamento (PATCH /quotes/:quoteId)

- Campos a serem atualizados: apenas status

### Regras

- Só pode ser atualizado nesse endpoint para APPROVED ou REJECTED e se estiver com o status atual como SENT

- Não permitir atualizar novamente o status se já estiver naquele status

- Caso seja APPROVED:

  - Validar se não existe outro orçamento aprovado
  - Criar StockReservation para cada peça/insumo
  - Incrementar reservedStock na tabela PartSupply
  - Copiar itens de QuoteService e QuotePartSupply para WorkOrderService e WorkOrderPartSupply. Serviços devem ser criados com o status de pending
  - Calcular totalAmount da WorkOrder com base nas peças e serviços
  - Atualizar o approvedAt da ordem de serviço com base na data/hora atual
  - Atualizar status do Quote para APPROVED
  - Atualizar o status da ordem de serviço para APPROVED (Registrar também na StatusHistory)
  - Rejeitar todos os outros orçamentos que estejam PENDING da mesma ordem de serviço
  - Se o estoque estiver insuficiente (com base na quantity de PartSupply - reservedStock), lançar erro e não deixar aprovar

- Caso seja REJECTED:

  - Liberar reservas da tabela StockReservation (DELETE) e decrementar reservedStock da PartSupply
  - Atualizar status do Quote para REJECTED
  - Atualizar o status da ordem de serviço para APPROVED (Registrar também na StatusHistory)

Observação: a atualização para SENT é feita por outro endpoint (submissions)

## Enviar orçamento para aprovação (POST /quotes/:quoteId/submissions)

### Regras

- Atualizar status do orçamento para SENT e atualizar sentAt com a data/hora atual
- Atualizar o status da ordem de serviço para AWAITING_APPROVAL
- Não recebe nada no payload
- Só pode ser feito o envio para aprovação se tiver no status PENDING
- O envio é feito via email. Para isso, criar o serviço de envio de email, com base nisso:

### Funcionalidade de envio de email

- Criar container do mailhog no docker-compose

- Dependências:

```
npm install @nestjs-modules/mailer nodemailer
```

- Configurar o MailModule:

```
// mail.module.ts
import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: 'localhost',
        port: 1025,
        secure: false,
      },
      defaults: {
        from: '"App" <no-reply@app.com>',
      },
    }),
  ],
})
export class MailModule {}
```

- Serviço de envio de email:

```
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailer: MailerService) {}

  async sendBudgetApprovalEmail(to: string, budgetId: string) {
    await this.mailer.sendMail({
      to,
      subject: 'Budget approval request',
      text: `Please approve the budget #${budgetId}`,
      html: `<p>Please approve the budget <b>#${budgetId}</b></p>`,
    });
  }
}
```

Observação: Enviar email com link para realizar a aprovação direto na API. O link deve conter todas as identificações necessárias

- Contrato do Service (infrastructure) - clean code:

```
export interface EmailSender {
  send(data: SendEmailDTO): Promise<void>;
}
```

- Implementação:

```
@Injectable()
export class SmtpEmailSender implements EmailSender {
  constructor(private mailer: MailerService) {}

  async send(data: SendEmailDTO) {
    await this.mailer.sendMail(data);
  }
}
```

## Atualizar status do serviço na OS (PATCH /work-orders/:workOrderId/services/:serviceId)

- Campo recebido: status

### Regras

- Status só pode ser alterado para IN_PROGRESS e COMPLETED
- Status só pode ser alterado para COMPLETED se tiver no status atual IN_PROGRESS
- Ao alterar para IN_PROGRESS, atualizar o campo startedAt com a data/hora atual
- Ao alterar para COMPLETED, atualizar o campo FINISHED_AT com a data/hora atual
- Não permitir atualizar novamente o status se já estiver naquele status
- Se o status do serviço for alterado para IN_PROGRESS, o status da OS deve ser alterado para IN_PROGRESS também (se não estiver IN_PROGRESS ainda)
- Se o status da OS for alterado para IN_PROGRESS, a baixa no estoque deve ser registrada, ou seja, deve sair da reserva (delete da StockReservation e decremento na reservedStock de PartSupply) para uma movimentação de estoque real (EXIT) e atualizar a quantity da peça/insumo (decremento) e criar StockMovement
- Se todos os serviços tiverem concluídos, o status da OS deve ser atualizado para COMPLETED

## Retornar tempo médio de execução do serviço (GET /services/{id}/metrics)

- Campos a serem retornados: averageExecutionTime

### Regras

- Calcular com base na data/hora de início e data/hora fim das WorkOrderServices

- Deve exigir autenticação e role de Admin

## Retornar tempo médio de execução de todos os serviços (GET /services-metrics)

- Campos a serem retornados: Array com serviceId e averageExecutionTime

### Regras

- Calcular com base na data/hora de início e data/hora fim das WorkOrderServices


- Deve exigir autenticação e role de Admin

## Retornar a lista de movimentações de estoque (GET /movimentacoes-estoque)

- Campos a serem retornados: Array com id, partSupply (partSupplyId, name, description, sku, partNumber, category, unit, quantity), workOrder (id, number, customer (id, name, type, document, phone, email), vehicle (id, plate, brand, model, year, color), assignedUser (id, name, email, role)), type, quantity, reason, createdAt

- Filtros: campos padrão de paginação, partSupplyId e workOrderId

- Deve exigir autenticação e role de Admin ou Attendent

## Retornar a lista de movimentações de status (GET /worker-orders/:id/movimentacoes-status)

- Campos a serem retornados: Array com id, changedBy (id, name, role, email), previousStatus, newStatus, notes e createdAt

- Observação: essa listagem não precisa ser paginada

- Deve exigir autenticação e role de Admin ou Attendent

## Retornar a lista de reservas de estoque (GET /reservas-estoque)

- Campos a serem retornados: Array com id, partSupply (partSupplyId, name, description, sku, partNumber, category, unit, quantity), workOrder (id, number, customer (id, name, type, document, phone, email), vehicle (id, plate, brand, model, year, color), assignedUser (id, name, email, role)), quantity, createdAt

- Filtros: campos padrão de paginação, partSupplyId e workOrderId

- Deve exigir autenticação e role de Admin ou Attendent

# Observações:

- Ajustar exclusão de serviço para permitir excluir apenas se não existir itens associados (QuoteService ou WorkOrderService, usando o um método "has" no repositorym, seguindo o padrão do projeto)

- Implemente o código da work-order.entity e demais entities associadas, seguindo os padrões das entities do projeto e as regras do schema dela no Prisma.

- Para os campos que são UUID, validar na entity, na DTO da request recebida pelo controller e nos path/query params se é um UUID válido.

- Implemente os paths dos endpoints seguindo o padrão restfull

- Use transactions no Prisma para as operações críticas que realizam mais de uma operação de escrita no banco de dados

- Todos os endpoints devem exigir autenticação. Os que não tiver especificado as roles, é porque pode todas.

- Implemente usando todos os padrões do projeto (DTOs, nomenclaturas, paginação, DDD, exceptions lançadas etc)

- Para os campos com default no model do Prisma, garantir que o domain (entity) faça as inserções dos valores com os valores padrão de toda forma, por mais que o banco de dados garanta isso, para que o domínio também garanta suas regras

- Implemente os testes unitários e os testes de integração também. Garanta a cobertura de todas as linhas e de todas as regras de negócio

- Faça as documentação do swagger corretamente

- Aplique as validações nos DTOs das requests com o class-validator e também nas entities de domínio, seguindo o padrão adotado no projeto

- Atualize o README do projeto

Crie uma SDD (Spec Driven Development) e peça confirmação antes de prosseguir com a implementação.
