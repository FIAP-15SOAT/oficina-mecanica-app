import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

describe('PartSupply Entity', () => {
  const validProps = {
    name: 'Filtro de Óleo',
    sku: 'FO-001',
    category: PartSupplyCategory.PART,
    unit: Unit.UN,
    costPrice: 25.0,
    salePrice: 45.0,
  };

  describe('create (factory method)', () => {
    describe('when valid', () => {
      it('should create a part/supply with required fields and defaults', () => {
        const partSupply = PartSupply.create(validProps);

        expect(partSupply.name).toBe('Filtro de Óleo');
        expect(partSupply.sku).toBe('FO-001');
        expect(partSupply.category).toBe(PartSupplyCategory.PART);
        expect(partSupply.unit).toBe(Unit.UN);
        expect(partSupply.costPrice).toBe(25.0);
        expect(partSupply.salePrice).toBe(45.0);
        expect(partSupply.stock).toBe(0);
        expect(partSupply.minStock).toBe(0);
        expect(partSupply.isActive).toBe(true);
        expect(partSupply.id).toBeDefined();
        expect(partSupply.createdAt).toBeInstanceOf(Date);
        expect(partSupply.updatedAt).toBeInstanceOf(Date);
      });

      it('should accept all optional fields', () => {
        const expiresAt = new Date('2027-12-31');
        const partSupply = PartSupply.create({
          ...validProps,
          description: 'Filtro para motor 1.0',
          partNumber: 'MANN-W712',
          stock: 10,
          minStock: 2,
          expiresAt,
        });

        expect(partSupply.description).toBe('Filtro para motor 1.0');
        expect(partSupply.partNumber).toBe('MANN-W712');
        expect(partSupply.stock).toBe(10);
        expect(partSupply.minStock).toBe(2);
        expect(partSupply.expiresAt).toBe(expiresAt);
      });

      it('should trim name and sku', () => {
        const partSupply = PartSupply.create({
          ...validProps,
          name: '  Filtro de Óleo  ',
          sku: '  FO-001  ',
        });

        expect(partSupply.name).toBe('Filtro de Óleo');
        expect(partSupply.sku).toBe('FO-001');
      });

      it('should trim optional string fields', () => {
        const partSupply = PartSupply.create({
          ...validProps,
          description: '  Filtro para motor  ',
          partNumber: '  MANN-W712  ',
        });

        expect(partSupply.description).toBe('Filtro para motor');
        expect(partSupply.partNumber).toBe('MANN-W712');
      });

      it('should set description to undefined when not provided', () => {
        const partSupply = PartSupply.create(validProps);

        expect(partSupply.description).toBeUndefined();
      });
    });

    describe('name validation', () => {
      it('should throw when name is empty', () => {
        expect(() => PartSupply.create({ ...validProps, name: '' })).toThrow(
          DomainValidationException,
        );
        expect(() => PartSupply.create({ ...validProps, name: '' })).toThrow('Nome é obrigatório');
      });

      it('should throw when name is too short', () => {
        expect(() => PartSupply.create({ ...validProps, name: 'AB' })).toThrow(
          'Nome deve ter no mínimo 3 caracteres',
        );
      });

      it('should throw when name is too long', () => {
        const longName = 'A'.repeat(151);
        expect(() => PartSupply.create({ ...validProps, name: longName })).toThrow(
          'Nome deve ter no máximo 150 caracteres',
        );
      });
    });

    describe('sku validation', () => {
      it('should throw when sku is empty', () => {
        expect(() => PartSupply.create({ ...validProps, sku: '' })).toThrow('SKU é obrigatório');
      });

      it('should throw when sku exceeds max length', () => {
        const longSku = 'A'.repeat(61);
        expect(() => PartSupply.create({ ...validProps, sku: longSku })).toThrow(
          'SKU deve ter no máximo 60 caracteres',
        );
      });
    });

    describe('partNumber validation', () => {
      it('should throw when partNumber exceeds max length', () => {
        const longPartNumber = 'A'.repeat(61);
        expect(() => PartSupply.create({ ...validProps, partNumber: longPartNumber })).toThrow(
          'Número de referência deve ter no máximo 60 caracteres',
        );
      });

      it('should accept undefined partNumber without error', () => {
        expect(() => PartSupply.create({ ...validProps, partNumber: undefined })).not.toThrow();
      });
    });

    describe('description validation', () => {
      it('should throw when description exceeds max length', () => {
        const longDescription = 'A'.repeat(501);
        expect(() => PartSupply.create({ ...validProps, description: longDescription })).toThrow(
          'Descrição deve ter no máximo 500 caracteres',
        );
      });
    });

    describe('costPrice validation', () => {
      it('should throw when costPrice is zero', () => {
        expect(() => PartSupply.create({ ...validProps, costPrice: 0 })).toThrow(
          'Preço de custo deve ser maior que zero',
        );
      });

      it('should throw when costPrice is negative', () => {
        expect(() => PartSupply.create({ ...validProps, costPrice: -1 })).toThrow(
          'Preço de custo deve ser maior que zero',
        );
      });

      it('should throw when costPrice is not finite', () => {
        expect(() => PartSupply.create({ ...validProps, costPrice: Infinity })).toThrow(
          'Preço de custo inválido',
        );
      });
    });

    describe('salePrice validation', () => {
      it('should throw when salePrice is zero', () => {
        expect(() => PartSupply.create({ ...validProps, salePrice: 0 })).toThrow(
          'Preço de venda deve ser maior que zero',
        );
      });

      it('should throw when salePrice is negative', () => {
        expect(() => PartSupply.create({ ...validProps, salePrice: -5 })).toThrow(
          'Preço de venda deve ser maior que zero',
        );
      });

      it('should throw when salePrice is NaN', () => {
        expect(() => PartSupply.create({ ...validProps, salePrice: NaN })).toThrow(
          'Preço de venda inválido',
        );
      });
    });

    describe('stock validation', () => {
      it('should throw when stock is not an integer', () => {
        expect(() => PartSupply.create({ ...validProps, stock: 1.5 })).toThrow(
          'Estoque deve ser um número inteiro',
        );
      });

      it('should throw when stock is negative', () => {
        expect(() => PartSupply.create({ ...validProps, stock: -1 })).toThrow(
          'Estoque não pode ser negativo',
        );
      });

      it('should accept stock of zero', () => {
        expect(() => PartSupply.create({ ...validProps, stock: 0 })).not.toThrow();
      });
    });

    describe('minStock validation', () => {
      it('should throw when minStock is not an integer', () => {
        expect(() => PartSupply.create({ ...validProps, minStock: 0.5 })).toThrow(
          'Estoque mínimo deve ser um número inteiro',
        );
      });

      it('should throw when minStock is negative', () => {
        expect(() => PartSupply.create({ ...validProps, minStock: -1 })).toThrow(
          'Estoque mínimo não pode ser negativo',
        );
      });
    });
  });

  describe('activate', () => {
    it('should activate an inactive part/supply', () => {
      const partSupply = new PartSupply({ isActive: false, updatedAt: new Date('2026-01-01') });

      partSupply.activate();

      expect(partSupply.isActive).toBe(true);
    });

    it('should throw when already active', () => {
      const partSupply = new PartSupply({ isActive: true });

      expect(() => partSupply.activate()).toThrow('Peça ou Insumo já está ativo');
    });

    it('should update updatedAt when activated', () => {
      const before = new Date('2026-01-01');
      const partSupply = new PartSupply({ isActive: false, updatedAt: before });

      partSupply.activate();

      expect(partSupply.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('deactivate', () => {
    it('should deactivate an active part/supply', () => {
      const partSupply = new PartSupply({ isActive: true, updatedAt: new Date() });

      partSupply.deactivate();

      expect(partSupply.isActive).toBe(false);
    });

    it('should throw when already inactive', () => {
      const partSupply = new PartSupply({ isActive: false });

      expect(() => partSupply.deactivate()).toThrow('Peça ou Insumo já está desativado');
    });
  });

  describe('setActive', () => {
    it('should activate when setActive(true) is called on inactive entity', () => {
      const partSupply = new PartSupply({ isActive: false, updatedAt: new Date() });

      partSupply.setActive(true);

      expect(partSupply.isActive).toBe(true);
    });

    it('should deactivate when setActive(false) is called on active entity', () => {
      const partSupply = new PartSupply({ isActive: true, updatedAt: new Date() });

      partSupply.setActive(false);

      expect(partSupply.isActive).toBe(false);
    });
  });
});
