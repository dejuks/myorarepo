import { IEmailProvider, SendEmailInput } from '@infrastructure/providers/email-provider.interface';
import { logger } from '@common/logger/logger';

/**
 * Zero-dependency default provider: logs what would be sent instead of
 * actually delivering it. This is what runs out of the box in dev/test
 * and until a real SMTP relay (Ethio Telecom Mail, in production) is
 * configured via EMAIL_PROVIDER=smtp.
 */
export class ConsoleEmailProvider implements IEmailProvider {
  async send(input: SendEmailInput): Promise<void> {
    logger.info({ to: input.to, subject: input.subject }, 'Email dispatched (console provider — not actually sent)');
  }
}
