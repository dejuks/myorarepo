#!/usr/bin/env node
/**
 * Seeds one demo platform account per Oromo Wikipedia role (spec section D:
 * "Roles and Responsibilities") so you can log in as each and see the
 * permission-gated behavior wiki-service's Phase 1/2 work actually built:
 *
 *   Registered Editor       -> wiki-editor@ora.local      (REGISTERED_EDITOR)
 *   Administrator (Sysop)   -> wiki-admin@ora.local        (ADMINISTRATOR)
 *   Bureaucrat & Steward    -> wiki-bureaucrat@ora.local   (BUREAUCRAT)
 *   Oversighter / CheckUser -> wiki-oversighter@ora.local  (OVERSIGHTER)
 *
 * All four share one password (DEMO_PASSWORD below) so they're easy to
 * remember while testing. Every account can already create/edit articles
 * once logged in (Phase 1/2 puts no extra gate on that — see wiki-service's
 * README's "Editing model") — what differs per role is which of the
 * moderation actions on an article page they can actually use:
 *   - Registered Editor: create/edit articles, submit for review.
 *   - Administrator: also start review, record a decision, publish, archive
 *     (the "Workflow" panel on an article page — see WikiArticlePage.tsx).
 *   - Bureaucrat: everything Administrator can, plus assigning/revoking
 *     module roles for other members (Wiki -> Roles in the sidebar).
 *   - Oversighter: same editing rights as a Registered Editor today —
 *     revision suppression / IP access is a later phase (see
 *     docs/01-architecture.md's "Future phases" note), so this account is
 *     seeded now mainly so the role exists and is assignable/testable.
 *
 * HOW IT WORKS
 * Goes through the real platform APIs via the gateway, exactly like the
 * frontend does (create profile -> register credentials -> wait for the
 * profile to activate -> assign the wiki-service module role), using the
 * bootstrapped platform super-admin account to authenticate the profile
 * lookups and the role assignment (a platform ADMIN token is accepted
 * everywhere a module's own top role is required — see wiki-service's
 * auth.middleware.ts PLATFORM_ADMIN_ROLE override). Nothing is written
 * directly to any service's database.
 *
 * Idempotent / safe to re-run: an account that already exists (profile
 * and/or credentials) is detected and reused rather than recreated, and
 * re-assigning a role a user already has is a no-op on the backend.
 *
 * USAGE
 *   node scripts/seed-wiki-demo-users.mjs
 *
 * ENV (all optional, defaults match infra/docker-compose.yml out of the box)
 *   GATEWAY_URL          default http://localhost:8080/api/v1
 *   SUPER_ADMIN_EMAIL    default admin@ora.local
 *   SUPER_ADMIN_PASSWORD default ChangeMe123!
 *   DEMO_PASSWORD        default DemoPass123!
 *
 * Requires Node 18+ (uses global fetch and crypto.randomUUID).
 */

import { randomUUID } from 'node:crypto';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080/api/v1';
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@ora.local';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe123!';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'DemoPass123!';

const DEMO_USERS = [
  {
    email: 'wiki-editor@ora.local',
    firstName: 'Wiki',
    lastName: 'Editor',
    actorLabel: 'Registered Editor',
    wikiRole: 'REGISTERED_EDITOR',
  },
  {
    email: 'wiki-admin@ora.local',
    firstName: 'Wiki',
    lastName: 'Administrator',
    actorLabel: 'Administrator (Sysop)',
    wikiRole: 'ADMINISTRATOR',
  },
  {
    email: 'wiki-bureaucrat@ora.local',
    firstName: 'Wiki',
    lastName: 'Bureaucrat',
    actorLabel: 'Bureaucrat & Global Steward',
    wikiRole: 'BUREAUCRAT',
  },
  {
    email: 'wiki-oversighter@ora.local',
    firstName: 'Wiki',
    lastName: 'Oversighter',
    actorLabel: 'Oversighter / CheckUser',
    wikiRole: 'OVERSIGHTER',
  },
];

/** Thin wrapper: parses the platform's {success, data|error} envelope and throws a readable Error on failure. */
async function apiCall(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`${method} ${path} -> HTTP ${res.status} with a non-JSON response`);
  }

  if (!res.ok || json.success === false) {
    const message = json?.error?.message || json?.message || `HTTP ${res.status}`;
    const code = json?.error?.code;
    const err = new Error(message);
    err.status = res.status;
    err.code = code;
    throw err;
  }
  return json;
}

async function loginSuperAdmin() {
  console.log(`Logging in as the platform super-admin (${SUPER_ADMIN_EMAIL})...`);
  try {
    const { data } = await apiCall('POST', '/auth/login', {
      body: { email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD },
    });
    return data.accessToken;
  } catch (err) {
    throw new Error(
      `Could not log in as the super-admin (${err.message}). ` +
        'Make sure the stack is up, SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD match your docker-compose values, ' +
        'and enough time has passed since startup for the bootstrap to run.',
    );
  }
}

/** Looks up an existing user-service profile by exact email match, or returns null. */
async function findProfileByEmail(adminToken, email) {
  const { data } = await apiCall('GET', `/users?search=${encodeURIComponent(email)}&pageSize=50`, { token: adminToken });
  return data.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

/** Creates the user-service profile + auth-service credentials for a new demo account, or reuses what already exists. */
async function ensureAccount(adminToken, demoUser) {
  const existing = await findProfileByEmail(adminToken, demoUser.email);
  if (existing) {
    console.log(`  Profile already exists (${existing.id}) — reusing it.`);
    return { id: existing.id, freshlyCreated: false };
  }

  const id = randomUUID();
  await apiCall('POST', '/users', {
    body: { id, email: demoUser.email, firstName: demoUser.firstName, lastName: demoUser.lastName },
  });
  console.log(`  Created profile ${id}.`);

  try {
    await apiCall('POST', '/auth/register', { body: { userId: id, email: demoUser.email, password: DEMO_PASSWORD } });
    console.log('  Registered login credentials.');
  } catch (err) {
    if (err.status === 409) {
      console.log('  Credentials already existed for this email — reusing them.');
    } else {
      throw err;
    }
  }

  return { id, freshlyCreated: true };
}

/** Registration activates the profile asynchronously (over RabbitMQ) — poll briefly rather than assuming it's already ACTIVE. */
async function waitForActive(adminToken, userId, { attempts = 10, delayMs = 500 } = {}) {
  for (let i = 0; i < attempts; i++) {
    const { data } = await apiCall('GET', `/users/${userId}`, { token: adminToken });
    if (data.status === 'ACTIVE') return true;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

async function assignWikiRole(adminToken, userId, roleName) {
  await apiCall('POST', `/wiki/members/${userId}/roles`, { token: adminToken, body: { roleName } });
}

async function main() {
  const adminToken = await loginSuperAdmin();
  console.log('Logged in.\n');

  const results = [];

  for (const demoUser of DEMO_USERS) {
    console.log(`== ${demoUser.actorLabel} (${demoUser.email}) ==`);
    try {
      const { id, freshlyCreated } = await ensureAccount(adminToken, demoUser);

      if (freshlyCreated) {
        console.log('  Waiting for the profile to activate...');
        const active = await waitForActive(adminToken, id);
        console.log(active ? '  Active.' : '  Still not ACTIVE after waiting — it may need a manual check, but continuing.');
      }

      await assignWikiRole(adminToken, id, demoUser.wikiRole);
      console.log(`  Assigned wiki-service role ${demoUser.wikiRole}.`);

      results.push({ ...demoUser, id, status: 'ready' });
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      results.push({ ...demoUser, status: 'failed', error: err.message });
    }
    console.log('');
  }

  console.log('== Summary ==');
  console.log(`${'Role'.padEnd(26)}${'Email'.padEnd(28)}${'Password'.padEnd(16)}Status`);
  for (const r of results) {
    console.log(
      `${r.actorLabel.padEnd(26)}${r.email.padEnd(28)}${(r.status === 'ready' ? DEMO_PASSWORD : '-').padEnd(16)}${r.status}${
        r.error ? ` (${r.error})` : ''
      }`,
    );
  }

  const failed = results.filter((r) => r.status !== 'ready');
  if (failed.length > 0) {
    console.log(`\n${failed.length} of ${results.length} accounts did not finish seeding — see the FAILED lines above.`);
    process.exitCode = 1;
  } else {
    console.log(`\nAll ${results.length} demo accounts are ready. Log in at your frontend with any of the emails above and password "${DEMO_PASSWORD}".`);
  }
}

main().catch((err) => {
  console.error(`\nSeed script aborted: ${err.message}`);
  process.exitCode = 1;
});
