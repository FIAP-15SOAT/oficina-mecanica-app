import { PartialType } from '@nestjs/swagger';
import { CreatePartSupplyRequestDto } from './create-part-supply-request.dto';

export class UpdatePartSupplyRequestDto extends PartialType(CreatePartSupplyRequestDto) {}
