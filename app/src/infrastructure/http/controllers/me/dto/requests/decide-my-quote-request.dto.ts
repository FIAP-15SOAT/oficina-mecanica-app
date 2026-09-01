import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';

export class DecideMyQuoteRequestDto {
  @ApiProperty({ enum: QuoteDecisionAction })
  @IsEnum(QuoteDecisionAction)
  action!: QuoteDecisionAction;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}
