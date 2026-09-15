export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

/** Port for the External Integration Layer's Email Service (docs/01-architecture.md §8) — swap the implementation without touching NotificationService. */
export interface IEmailProvider {
  send(input: SendEmailInput): Promise<void>;
}
