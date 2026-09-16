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
import { AdminRolesPage } from '@/pages/AdminRolesPage';
import { ModuleRolesPage } from '@/pages/ModuleRolesPage';
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

          <Route element={<AdminRoute />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
            <Route path="/admin/roles" element={<AdminRolesPage />} />
          </Route>

          {/* Module admins (a module's own top role) can reach their module's dashboard
              without being platform ADMIN — see ModuleRoute's doc comment. */}
          <Route element={<ModuleRoute />}>
            <Route path="/admin/modules/:moduleKey" element={<ModuleRolesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
