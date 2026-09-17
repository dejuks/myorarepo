export interface IRolePermissionRepository {
  /** Permission keys currently granted to one role (used to render its edit view). */
  listPermissionKeysForRole(roleId: string): Promise<string[]>;

  /**
   * Permission keys granted to ANY of the given role names, deduplicated.
   * This is the live-lookup half of requirePermission()/requireSelfOrPermission() —
   * always queried fresh, never cached on the caller's JWT, so a role's
   * permissions can change and take effect on the very next request.
   */
  listPermissionKeysForRoleNames(roleNames: string[]): Promise<string[]>;

  /** Replaces a role's full permission set with exactly the given permission ids. */
  setForRole(roleId: string, permissionIds: string[]): Promise<void>;
}
