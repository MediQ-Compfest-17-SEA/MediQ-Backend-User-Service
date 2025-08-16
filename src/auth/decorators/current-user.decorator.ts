import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator @CurrentUser untuk mengambil data pengguna dari request.
 * Data ini sebelumnya sudah divalidasi dan ditempelkan ke request
 * oleh JwtStrategy (Passport.js).
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);