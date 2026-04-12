import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Oficina Mecânica API')
    .setDescription(
      'Sistema Integrado de Atendimento e Execução de Serviços — ' +
        'Gestão de ordens de serviço, clientes, veículos, peças e serviços.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Informe o token JWT',
      },
      'access-token',
    )
    .addTag('Auth', 'Autenticação e registro de usuários')
    .addTag('Users', 'Gestão de usuários do sistema')
    .addTag('Customers', 'Cadastro e gestão de clientes')
    .addTag('Vehicles', 'Cadastro e gestão de veículos')
    .addTag('Services', 'Catálogo de serviços da oficina')
    .addTag('Parts', 'Peças e insumos com controle de estoque')
    .addTag('Work Orders', 'Ordens de serviço e acompanhamento')
    .addTag('Quotes', 'Orçamentos das ordens de serviço')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
    customSiteTitle: 'Oficina Mecânica — API Docs',
  });
}
