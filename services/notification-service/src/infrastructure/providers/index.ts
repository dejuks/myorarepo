import { env } from '@config/env';
import { IEmailProvider } from '@infrastructure/providers/email-provider.interface';
import { ConsoleEmailProvider } from '@infrastructure/providers/console-email.provider';
import { SmtpEmailProvider } from '@infrastructure/providers/smtp-email.provider';

export function createEmailProvider(): IEmailProvider {
  return env.EMAIL_PROVIDER === 'smtp' ? new SmtpEmailProvider() : new ConsoleEmailProvider();
}
