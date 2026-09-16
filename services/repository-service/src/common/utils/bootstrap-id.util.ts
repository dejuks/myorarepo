import { v5 as uuidv5 } from 'uuid';

/**
 * repository-service's copy of this file.
 *
 * Fixed namespace UUID for deriving deterministic platform-wide user IDs
 * from an email address, used ONLY for the super-admin bootstrap seed.
 *
 * auth-service and user-service each own a separate database and normally
 * agree on a user's id because whichever service creates it first hands it
 * to the other over the wire (see docs/01-architecture.md — user-service
 * pre-generates the id, the client passes the same id to auth-service's
 * /auth/register). The bootstrap seed has no such handshake: both services
 * seed independently at container startup, so instead they each compute
 * the SAME id from the SAME email via UUID v5, with no coordination
 * required. This constant must stay byte-for-byte identical in both
 * services' copies of this file, or the two rows won't line up and
 * GET /users/me will 404 for the seeded admin.
 *
 * This is intentionally a bootstrap-only mechanism, not a general pattern —
 * every other user id in the platform is a random v4 UUID.
 */
const ORA_BOOTSTRAP_NAMESPACE = '9c3b1f0a-9d7a-4f3e-8b1d-2f7a6e5c4d3b';

/** Deterministically derives the platform user id the super-admin seed will use for a given email. */
export function computeBootstrapUserId(email: string): string {
  return uuidv5(email.trim().toLowerCase(), ORA_BOOTSTRAP_NAMESPACE);
}
