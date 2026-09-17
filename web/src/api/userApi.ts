import { apiClient, toApiErrorInfo, unwrap } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { Gender, PaginatedResult, Permission, Role, User, UserStatus } from '@/types/domain';

export function getMe(): Promise<User> {
  return unwrap(apiClient.get<ApiEnvelope<User>>('/users/me'));
}

export function getUser(id: string): Promise<User> {
  return unwrap(apiClient.get<ApiEnvelope<User>>(`/users/${id}`));
}

export interface ListUsersParams {
  status?: UserStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Admin only — server enforces this; a non-admin caller gets a real 403 surfaced via toApiErrorInfo. */
export async function listUsers(params: ListUsersParams): Promise<PaginatedResult<User>> {
  try {
    const response = await apiClient.get<ApiEnvelope<User[]>>('/users', {
      params: {
        status: params.status || undefined,
        search: params.search || undefined,
        page: params.page,
        pageSize: params.pageSize,
      },
    });
    const data = response.data;
    if (!data.success) {
      throw { message: data.error.message, code: data.error.code };
    }
    return {
      items: data.data,
      total: data.meta?.total ?? data.data.length,
      page: data.meta?.page ?? params.page ?? 1,
      pageSize: data.meta?.pageSize ?? params.pageSize ?? 20,
    };
  } catch (err) {
    throw toApiErrorInfo(err);
  }
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  locale?: string;
  gender?: Gender;
  dateOfBirth?: string;
  address?: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
}

export function updateProfile(userId: string, payload: UpdateProfilePayload): Promise<User> {
  return unwrap(apiClient.patch<ApiEnvelope<User>>(`/users/${userId}`, payload));
}

export interface UpdateUserStatusPayload {
  status: UserStatus;
  reason?: string;
}

export function updateUserStatus(userId: string, payload: UpdateUserStatusPayload): Promise<User> {
  return unwrap(apiClient.patch<ApiEnvelope<User>>(`/users/${userId}/status`, payload));
}

export interface AssignRolePayload {
  roleName: string;
  /** ISO 8601 timestamp. Omit for a permanent grant; must be in the future when provided. */
  expiresAt?: string;
}

/** Admin only. */
export function assignRole(userId: string, payload: AssignRolePayload): Promise<User> {
  return unwrap(apiClient.post<ApiEnvelope<User>>(`/users/${userId}/roles`, payload));
}

/** Admin only. */
export function revokeRole(userId: string, roleName: string): Promise<User> {
  return unwrap(apiClient.delete<ApiEnvelope<User>>(`/users/${userId}/roles/${roleName}`));
}

export function listRoles(): Promise<Role[]> {
  return unwrap(apiClient.get<ApiEnvelope<Role[]>>('/roles'));
}

export interface CreateRolePayload {
  name: string;
  description?: string;
}

/** Admin only. */
export function createRole(payload: CreateRolePayload): Promise<Role> {
  return unwrap(apiClient.post<ApiEnvelope<Role>>('/roles', payload));
}

/**
 * Admin only. The backend responds 204 No Content on success (no envelope body),
 * so this doesn't go through `unwrap` — errors (400 for a system role, 404, etc.)
 * still arrive as an envelope and are normalized the same way.
 */
export async function deleteRole(id: string): Promise<void> {
  try {
    await apiClient.delete(`/roles/${id}`);
  } catch (err) {
    throw toApiErrorInfo(err);
  }
}

/** Requires roles.manage_catalog. The fixed catalog powering the checkbox editor on a role's edit view. */
export function listPermissions(): Promise<Permission[]> {
  return unwrap(apiClient.get<ApiEnvelope<Permission[]>>('/permissions'));
}

export interface RolePermissions {
  role: Role;
  permissionKeys: string[];
}

/** Requires roles.manage_catalog. */
export function getRolePermissions(roleId: string): Promise<RolePermissions> {
  return unwrap(apiClient.get<ApiEnvelope<RolePermissions>>(`/roles/${roleId}/permissions`));
}

/**
 * Requires roles.manage_catalog. Replaces the role's ENTIRE permission set
 * with `permissionKeys` — not a diff. Takes effect for every user holding
 * this role on their very next request; no re-login required.
 */
export function setRolePermissions(roleId: string, permissionKeys: string[]): Promise<RolePermissions> {
  return unwrap(apiClient.put<ApiEnvelope<RolePermissions>>(`/roles/${roleId}/permissions`, { permissionKeys }));
}
