import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import {
  MyQuoteResponse,
  MyQuoteDataResponse,
  MyQuoteListResponse,
  MyQuoteItemResponse,
} from '@interface-adapters/me/responses/me.response';

export class MyQuoteItemResponseDto implements MyQuoteItemResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiProperty()
  totalPrice!: number;
}

export class MyQuoteResponseDto implements MyQuoteResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: QuoteStatus })
  status!: QuoteStatus;

  @ApiProperty()
  servicesAmount!: number;

  @ApiProperty()
  partsAmount!: number;

  @ApiProperty()
  totalAmount!: number;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiPropertyOptional({ nullable: true })
  sentAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  approvedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  rejectedAt!: Date | null;

  @ApiProperty({ type: [MyQuoteItemResponseDto] })
  services!: MyQuoteItemResponseDto[];

  @ApiProperty({ type: [MyQuoteItemResponseDto] })
  partsSupplies!: MyQuoteItemResponseDto[];
}

export class MyQuoteDataResponseDto implements MyQuoteDataResponse {
  @ApiProperty({ type: MyQuoteResponseDto })
  data!: MyQuoteResponseDto;
}

export class MyQuoteListResponseDto implements MyQuoteListResponse {
  @ApiProperty({ type: [MyQuoteResponseDto] })
  data!: MyQuoteResponseDto[];
}
