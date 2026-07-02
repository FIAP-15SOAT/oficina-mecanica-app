import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { PaginationDto } from '@presentation/common/dto/pagination.dto';

export class FilterQuotesDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID da Ordem de Serviço', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por status', enum: QuoteStatus })
  @IsOptional()
  @IsEnum(QuoteStatus, {
    message: `Status deve ser um dos seguintes: ${Object.values(QuoteStatus).join(', ')}`,
  })
  status?: QuoteStatus;
}

export class FindAllQuotesQueryDto extends IntersectionType(PaginationDto, FilterQuotesDto) {}
