import { validate } from 'class-validator';
import { CreateUserDto } from 'src/user/dto/create-user.dto';

describe('CreateUserDto', () => {
  let dto: CreateUserDto;

  beforeEach(() => {
    dto = new CreateUserDto();
  });

  it('should be defined', () => {
    expect(dto).toBeDefined();
  });

  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      // Arrange
      dto.name = 'John Doe';
      dto.email = 'john@example.com';
      dto.password = 'password123';
      dto.nik = '1234567890123456';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when name is empty', async () => {
      // Arrange
      dto.name = '';
      dto.email = 'john@example.com';
      dto.password = 'password123';
      dto.nik = '1234567890123456';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation when name is not provided', async () => {
      // Arrange
      dto.email = 'john@example.com';
      dto.password = 'password123';
      dto.nik = '1234567890123456';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
    });

    it('should fail validation when email is invalid', async () => {
      // Arrange
      dto.name = 'John Doe';
      dto.email = 'invalid-email';
      dto.password = 'password123';
      dto.nik = '1234567890123456';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints).toHaveProperty('isEmail');
    });

    it('should fail validation when email is empty', async () => {
      // Arrange
      dto.name = 'John Doe';
      dto.email = '';
      dto.password = 'password123';
      dto.nik = '1234567890123456';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
    });

    it('should fail validation when password is too short', async () => {
      // Arrange
      dto.name = 'John Doe';
      dto.email = 'john@example.com';
      dto.password = '123'; // Less than 4 characters
      dto.nik = '1234567890123456';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('password');
      expect(errors[0].constraints).toHaveProperty('minLength');
    });

    it('should fail validation when password is empty', async () => {
      // Arrange
      dto.name = 'John Doe';
      dto.email = 'john@example.com';
      dto.password = '';
      dto.nik = '1234567890123456';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('password');
    });

    it('should fail validation when NIK is not exactly 16 digits', async () => {
      // Arrange
      dto.name = 'John Doe';
      dto.email = 'john@example.com';
      dto.password = 'password123';
      dto.nik = '123456789012345'; // 15 digits

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('nik');
      expect(errors[0].constraints).toHaveProperty('isLength');
    });

    it('should fail validation when NIK contains non-numeric characters', async () => {
      // Arrange
      dto.name = 'John Doe';
      dto.email = 'john@example.com';
      dto.password = 'password123';
      dto.nik = '123456789012345a'; // Contains letter

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('nik');
      expect(errors[0].constraints).toHaveProperty('isNumeric');
    });

    it('should fail validation when NIK is empty', async () => {
      // Arrange
      dto.name = 'John Doe';
      dto.email = 'john@example.com';
      dto.password = 'password123';
      dto.nik = '';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('nik');
    });

    it('should fail validation with multiple errors', async () => {
      // Arrange
      dto.name = '';
      dto.email = 'invalid-email';
      dto.password = '12'; // Too short
      dto.nik = '123'; // Too short and will fail length validation

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThanOrEqual(3);
      const properties = errors.map(error => error.property);
      expect(properties).toContain('name');
      expect(properties).toContain('email');
      expect(properties).toContain('password');
      expect(properties).toContain('nik');
    });
  });
});
