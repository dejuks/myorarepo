import { AuthEventConsumer } from '@infrastructure/messaging/auth-event-consumer';
import { UserService } from '@application/services/user.service';
import { UserStatus } from '@domain/entities/user.entity';
import { FakeUserRepository, FakeRoleRepository, FakeUserRoleAssignmentRepository } from './fakes';

jest.mock('@infrastructure/messaging/rabbitmq.publisher', () => ({
  rabbitMqPublisher: { publish: jest.fn().mockResolvedValue(undefined) },
}));

/**
 * These tests exercise the consumer's message-handling logic directly
 * (bypassing amqplib entirely, same rationale as auth-service/notification-service's
 * lack of a live-broker test) — `handleMessage` and `handleEmailVerified` never
 * touch `this.connection`, only `bindAndConsume`/`start` do, so a fake channel and a
 * hand-built envelope are enough to cover the real decision logic: activate on a
 * PENDING user, no-op (and no channel.nack) on an already-active user, and
 * dead-letter (nack) a reference to a user that doesn't exist.
 */
describe('AuthEventConsumer', () => {
  let userRepo: FakeUserRepository;
  let userService: UserService;
  let consumer: AuthEventConsumer;
  let channel: { ack: jest.Mock; nack: jest.Mock };

  beforeEach(() => {
    userRepo = new FakeUserRepository();
    const roleRepo = new FakeRoleRepository();
    userService = new UserService(userRepo, roleRepo, new FakeUserRoleAssignmentRepository(roleRepo));
    consumer = new AuthEventConsumer(userService);
    channel = { ack: jest.fn(), nack: jest.fn() };
  });

  function envelopeMessage(eventType: string, payload: Record<string, unknown>) {
    return {
      content: Buffer.from(
        JSON.stringify({
          eventId: 'evt-1',
          eventType,
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          producer: 'auth-service',
          payload,
        }),
      ),
    };
  }

  it('activates a PENDING user on auth.email_verification.completed', async () => {
    const user = await userRepo.create({ email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe', status: UserStatus.PENDING });

    const msg = envelopeMessage('auth.email_verification.completed', { userId: user.id, email: user.email });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (consumer as any).handleMessage(channel, msg);

    const updated = await userRepo.findById(user.id);
    expect(updated?.status).toBe(UserStatus.ACTIVE);
    expect(channel.ack).toHaveBeenCalledTimes(1);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('is a no-op for a user that is already ACTIVE (idempotent redelivery)', async () => {
    const user = await userRepo.create({ email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe', status: UserStatus.ACTIVE });

    const msg = envelopeMessage('auth.email_verification.completed', { userId: user.id, email: user.email });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (consumer as any).handleMessage(channel, msg);

    const updated = await userRepo.findById(user.id);
    expect(updated?.status).toBe(UserStatus.ACTIVE);
    expect(channel.ack).toHaveBeenCalledTimes(1);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('leaves a DEACTIVATED user alone rather than throwing', async () => {
    const user = await userRepo.create({ email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe', status: UserStatus.DEACTIVATED });

    const msg = envelopeMessage('auth.email_verification.completed', { userId: user.id, email: user.email });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (consumer as any).handleMessage(channel, msg);

    const updated = await userRepo.findById(user.id);
    expect(updated?.status).toBe(UserStatus.DEACTIVATED);
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });

  it('dead-letters an auth.email_verification.completed event referencing a user that does not exist', async () => {
    const msg = envelopeMessage('auth.email_verification.completed', { userId: 'no-such-user', email: 'nobody@example.com' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (consumer as any).handleMessage(channel, msg);

    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
    expect(channel.ack).not.toHaveBeenCalled();
  });

  it('ignores routing keys other than auth.email_verification.completed', async () => {
    const user = await userRepo.create({ email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe', status: UserStatus.PENDING });

    const msg = envelopeMessage('auth.password_changed', { userId: user.id });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (consumer as any).handleMessage(channel, msg);

    const stillPending = await userRepo.findById(user.id);
    expect(stillPending?.status).toBe(UserStatus.PENDING);
    expect(channel.ack).toHaveBeenCalledTimes(1);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('dead-letters a malformed message body', async () => {
    const badMsg = { content: Buffer.from('not json') };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (consumer as any).handleMessage(channel, badMsg);

    expect(channel.nack).toHaveBeenCalledWith(badMsg, false, false);
    expect(channel.ack).not.toHaveBeenCalled();
  });

  it('ignores a null message (consumer cancellation signal)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (consumer as any).handleMessage(channel, null);
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).not.toHaveBeenCalled();
  });
});
