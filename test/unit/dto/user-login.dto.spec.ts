import { validate } from 'class-validator';
import { UserLoginDto } from 'src/auth/dto/user-login.dto';

describe('UserLoginDto', () => {
  let dto: UserLoginDto;

  beforeEach(() => {
    dto = new UserLoginDto();
  });

  it('should be defined', () => {
    expect(dto).toBeDefined();
  });

  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      // Arrange
      dto.nik = '1234567890123456';
      dto.name = 'John Doe';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when NIK is not exactly 16 digits', async () => {
      // Arrange
      dto.nik = '123456789012345'; // 15 digits
      dto.name = 'John Doe';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('nik');
      expect(errors[0].constraints).toHaveProperty('isLength');
    });

    it('should fail validation when NIK contains non-numeric characters', async () => {
      // Arrange
      dto.nik = '123456789012345a'; // Contains letter
      dto.name = 'John Doe';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('nik');
      expect(errors[0].constraints).toHaveProperty('isNumeric');
    });

    it('should fail validation when NIK is empty', async () => {
      // Arrange
      dto.nik = '';
      dto.name = 'John Doe';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('nik');
    });

    it('should fail validation when name is empty', async () => {
      // Arrange
      dto.nik = '1234567890123456';
      dto.name = '';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation when name is not provided', async () => {
      // Arrange
      dto.nik = '1234567890123456';
      // name is undefined

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
    });

    it('should fail validation with multiple errors', async () => {
      // Arrange
      dto.nik = '123'; // Too short
      dto.name = ''; // Empty

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThanOrEqual(2);
      const properties = errors.map(error => error.property);
      expect(properties).toContain('nik');
      expect(properties).toContain('name');
    });
  });
});
