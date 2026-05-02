import { SanitizeStringsPipe } from '@infrastructure/pipes/sanitize-strings.pipe';

describe('SanitizeStringsPipe', () => {
  let pipe: SanitizeStringsPipe;

  beforeEach(() => {
    pipe = new SanitizeStringsPipe();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should remove null characters from string', () => {
    const input = 'Hello\0World';
    const output = 'HelloWorld';
    expect(pipe.transform(input, {} as any)).toBe(output);
  });

  it('should recursively sanitize objects', () => {
    const input = {
      name: 'John\0Doe',
      meta: {
        info: 'Secret\0Info',
        count: 10,
      },
    };
    const output = {
      name: 'JohnDoe',
      meta: {
        info: 'SecretInfo',
        count: 10,
      },
    };
    expect(pipe.transform(input, {} as any)).toEqual(output);
  });

  it('should recursively sanitize arrays', () => {
    const input = ['Item\0One', { key: 'Val\0ue' }, 123];
    const output = ['ItemOne', { key: 'Value' }, 123];
    expect(pipe.transform(input, {} as any)).toEqual(output);
  });

  it('should return null/undefined as is', () => {
    expect(pipe.transform(null, {} as any)).toBeNull();
    expect(pipe.transform(undefined, {} as any)).toBeUndefined();
  });

  it('should return numbers as is', () => {
    expect(pipe.transform(123, {} as any)).toBe(123);
  });
});
