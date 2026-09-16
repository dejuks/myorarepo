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
    // `body` is included deliberately — this is the only way to grab a verification
    // link or password-reset code in local dev, since nothing is actually delivered.
    logger.info({ to: input.to, subject: input.subject, body: input.body }, 'Email dispatched (console provider — not actually sent)');
  }
}
