import { apiClient, toApiErrorInfo, unwrap } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { Role } from '@/types/domain';

/**
 * Generic client for any of the six standalone content-module RBAC
 * services (journal/ebook/library/wiki/repository/researcher — see
 * docs/01-architecture.md §2a). Every one of them exposes the exact same
 * shape — role catalog + member role assignment — under its own gateway
 * prefix, so a single parameterized client covers all six rather than
 * duplicating services/user-service's userApi.ts six times.
 */

export function listModuleRoles(prefix: string): Promise<Role[]> {
  return unwrap(apiClient.get<ApiEnvelope<Role[]>>(`${prefix}/roles`));
}

export interface CreateModuleRolePayload {
  name: string;
  description?: string;
}

/** Module-admin only (the module's top role, see MODULES config / each service's README). */
export function createModuleRole(prefix: string, payload: CreateModuleRolePayload): Promise<Role> {
  return unwrap(apiClient.post<ApiEnvelope<Role>>(`${prefix}/roles`, payload));
}

/** Module-admin only. 204 No Content on success, same pattern as userApi.deleteRole. */
export async function deleteModuleRole(prefix: string, id: string): Promise<void> {
  try {
    await apiClient.delete(`${prefix}/roles/${id}`);
  } catch (err) {
    throw toApiErrorInfo(err);
  }
}

/** Self or module-admin. Returns the member's role NAMES in this module (not full Role objects). */
export function listMemberRoles(prefix: string, userId: string): Promise<string[]> {
  return unwrap(apiClient.get<ApiEnvelope<string[]>>(`${prefix}/members/${userId}/roles`));
}

/** Module-admin only. Returns the member's updated role name list. */
export function assignMemberRole(prefix: string, userId: string, roleName: string): Promise<string[]> {
  return unwrap(apiClient.post<ApiEnvelope<string[]>>(`${prefix}/members/${userId}/roles`, { roleName }));
}

/** Module-admin only. Returns the member's updated role name list. */
export function revokeMemberRole(prefix: string, userId: string, roleName: string): Promise<string[]> {
  return unwrap(apiClient.delete<ApiEnvelope<string[]>>(`${prefix}/members/${userId}/roles/${roleName}`));
}
