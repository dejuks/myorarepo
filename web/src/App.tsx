import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthBootstrap } from '@/features/auth/useAuthBootstrap';
import { PublicRoute } from '@/routes/PublicRoute';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { AdminRoute } from '@/routes/AdminRoute';
import { ModuleRoute } from '@/routes/ModuleRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { AdminUsersPage } from '@/pages/AdminUsersPage';
import { AdminUserDetailPage } from '@/pages/AdminUserDetailPage';
import { CreateUserPage } from '@/pages/CreateUserPage';
import { AdminRolesPage } from '@/pages/AdminRolesPage';
import { RolePermissionsPage } from '@/pages/RolePermissionsPage';
import { PlatformSettingsPage } from '@/pages/PlatformSettingsPage';
import { ModuleRoleCatalogPage } from '@/pages/ModuleRoleCatalogPage';
import { ModuleMembersPage } from '@/pages/ModuleMembersPage';
import { WikiListPage } from '@/pages/WikiListPage';
import { WikiArticlePage } from '@/pages/WikiArticlePage';
import { WikiArticleEditPage } from '@/pages/WikiArticleEditPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function App() {
  useAuthBootstrap();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Not under PublicRoute: someone already signed in under a different account should
          still be able to verify a second one from the same browser. See VerifyEmailPage's
          doc comment. */}
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Oromo Wikipedia — Phase 1 (articles + revision history). Any authenticated
              account can create/edit, matching real Wikipedia's "logging in is the only
              bar to editing" model — see ArticleService's doc comment. */}
          <Route path="/wiki" element={<WikiListPage />} />
          <Route path="/wiki/new" element={<WikiArticleEditPage />} />
          <Route path="/wiki/:slug/edit" element={<WikiArticleEditPage />} />
          <Route path="/wiki/:slug" element={<WikiArticlePage />} />

          <Route element={<AdminRoute />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/users/new" element={<CreateUserPage />} />
            <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
            <Route path="/admin/roles" element={<AdminRolesPage />} />
            <Route path="/admin/roles/:id/permissions" element={<RolePermissionsPage />} />
            <Route path="/admin/settings" element={<PlatformSettingsPage />} />
          </Route>

          {/* Module admins (a module's own top role) can reach their module's dashboard
              without being platform ADMIN — see ModuleRoute's doc comment. Role catalog
              and member roles are separate full pages (not one two-panel page), linked
              via ModuleSectionTabs; the bare :moduleKey path redirects to the catalog. */}
          <Route element={<ModuleRoute />}>
            <Route path="/admin/modules/:moduleKey" element={<Navigate to="roles" replace />} />
            <Route path="/admin/modules/:moduleKey/roles" element={<ModuleRoleCatalogPage />} />
            <Route path="/admin/modules/:moduleKey/members" element={<ModuleMembersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
