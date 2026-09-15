import { IEmailProvider, SendEmailInput } from '@infrastructure/providers/email-provider.interface';
import { logger } from '@common/logger/logger';
import { env } from '@config/env';

/**
 * Placeholder for a real SMTP-backed provider (e.g. via nodemailer against
 * Ethio Telecom Mail or any SMTP relay). Deliberately not wired to an
 * actual SMTP library in Phase 2 to keep this service's dependency
 * footprint at zero external network calls out of the box; swapping this
 * in is a small, isolated change — implement `send` with nodemailer's
 * `createTransport({ host: env.SMTP_HOST, ... }).sendMail(...)` and this
 * class becomes a drop-in replacement for ConsoleEmailProvider with no
 * other code changes (see infrastructure/providers/index.ts).
 */
export class SmtpEmailProvider implements IEmailProvider {
  async send(input: SendEmailInput): Promise<void> {
    if (!env.SMTP_HOST) {
      logger.warn({ to: input.to }, 'EMAIL_PROVIDER=smtp but SMTP_HOST is not configured — email not sent');
      return;
    }
    // TODO(production): wire up nodemailer here.
    logger.info({ to: input.to, subject: input.subject, host: env.SMTP_HOST }, 'Would send via SMTP (not yet implemented)');
  }
}
