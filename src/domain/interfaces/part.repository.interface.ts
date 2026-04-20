import { Part } from '../entities/part.entity';

export interface IPartRepository {
  create(part: Part): Promise<Part>;
  findById(id: string): Promise<Part | null>;
  findByCode(code: string): Promise<Part | null>;
  findAll(activeOnly?: boolean): Promise<Part[]>;
  findLowStock(): Promise<Part[]>;
  update(id: string, data: Partial<Part>): Promise<Part>;
  updateStock(id: string, quantity: number): Promise<Part>;
  delete(id: string): Promise<void>;
}
