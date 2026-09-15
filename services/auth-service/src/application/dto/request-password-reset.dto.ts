import { IsEmail } from 'class-validator';

export class RequestPasswordResetDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  email!: string;
}
