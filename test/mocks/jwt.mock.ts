import { JwtService } from '@nestjs/jwt';

export const mockJwtService: jest.Mocked<JwtService> = {
  sign: jest.fn(),
  signAsync: jest.fn(),
  verify: jest.fn(),
  verifyAsync: jest.fn(),
  decode: jest.fn(),
} as any;

export const mockJwtTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

export const mockJwtPayload = {
  sub: '1',
  email: 'john@example.com',
  role: 'PASIEN',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
};

export const mockRefreshJwtPayload = {
  sub: '1',
  email: 'john@example.com',
  role: 'PASIEN',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 604800, // 7 days
};

// Setup default mocks
mockJwtService.sign.mockImplementation((payload) => {
  if (payload.type === 'refresh') {
    return mockJwtTokens.refreshToken;
  }
  return mockJwtTokens.accessToken;
});

mockJwtService.verify.mockReturnValue(mockJwtPayload);
