import { useState } from 'react';
import type { ReactNode, MouseEvent } from 'react';
import { Link as RouterLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DashboardIcon from '@mui/icons-material/DashboardOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBookOutlined';
import AutoStoriesIcon from '@mui/icons-material/AutoStoriesOutlined';
import LocalLibraryIcon from '@mui/icons-material/LocalLibraryOutlined';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import ArticleIcon from '@mui/icons-material/ArticleOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleAltIcon from '@mui/icons-material/PeopleAltOutlined';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useMyManagedModules } from '@/hooks/useMyManagedModules';
import { logout as logoutRequest } from '@/api/authApi';
import { loggedOut } from '@/features/auth/authSlice';
import { gradients, glass } from '@/theme';
import { Footer } from '@/components/Footer';
import type { ModuleConfig } from '@/config/modules';

const DRAWER_WIDTH = 264;

interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
  disabled?: boolean;
}

const primaryNavItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Profile', to: '/profile', icon: <PersonIcon /> },
  { label: 'Notifications', to: '/notifications', icon: <NotificationsIcon /> },
  // Every signed-in account can read/create/edit articles — this is deliberately NOT
  // gated like the "Module roles" section below, which is only for module-local role
  // management. See wiki-service's ArticleService for why there's no extra role gate.
  { label: 'Oromo Wikipedia', to: '/wiki', icon: <LocalLibraryIcon /> },
];

const adminNavItems: NavItem[] = [
  { label: 'Users', to: '/admin/users', icon: <PeopleAltIcon /> },
  { label: 'Roles', to: '/admin/roles', icon: <AdminPanelSettingsIcon /> },
  { label: 'Settings', to: '/admin/settings', icon: <SettingsIcon /> },
];

const moduleIcons: Record<string, ReactNode> = {
  journal: <ArticleIcon />,
  ebook: <MenuBookIcon />,
  library: <AutoStoriesIcon />,
  researcher: <GroupsIcon />,
  wiki: <LocalLibraryIcon />,
  repository: <MenuBookIcon />,
};

/**
 * Each module's own roles/permissions dashboard (see docs/01-architecture.md
 * §2a) — this is the "coming soon" section's replacement now that those six
 * services exist. They're not full content-management UIs yet (no manuscript
 * submission, cataloging, etc. — just each module's standalone RBAC), so the
 * label makes that explicit rather than implying more than what's there.
 * Built from `useMyManagedModules()` — platform ADMIN sees all six, anyone
 * else sees only the modules where they hold that module's own top role
 * (see ModuleRoute, which enforces the same set at the route level).
 */
function buildModuleNavItems(modules: ModuleConfig[]): NavItem[] {
  return modules.map((mod) => ({
    label: `${mod.label} — Roles`,
    to: `/admin/modules/${mod.key}`,
    icon: moduleIcons[mod.key] ?? <ArticleIcon />,
  }));
}

export function DashboardLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const refreshToken = useAppSelector((state) => state.auth.refreshToken);
  const { data: unreadCount } = useUnreadCount();
  const { data: currentUser } = useCurrentUser();
  const isAdmin = useIsAdmin();
  const { modules: managedModules } = useMyManagedModules();
  const moduleNavItems = buildModuleNavItems(managedModules);

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  function openMenu(event: MouseEvent<HTMLElement>) {
    setMenuAnchor(event.currentTarget);
  }
  function closeMenu() {
    setMenuAnchor(null);
  }

  async function handleLogout() {
    closeMenu();
    try {
      await logoutRequest(refreshToken);
    } catch {
      // Best-effort server-side revoke — still clear local state even if this call fails
      // (expired token, network blip, etc.), the user's intent is to be logged out.
    } finally {
      queryClient.clear();
      dispatch(loggedOut());
      navigate('/login', { replace: true });
    }
  }

  const initials = currentUser ? `${currentUser.firstName[0] ?? ''}${currentUser.lastName[0] ?? ''}`.toUpperCase() : '';

  function isSelected(to: string) {
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  }

  function handleNavClick() {
    if (!isDesktop) setMobileOpen(false);
  }

  const navListSx = {
    '& .MuiListItemButton-root': {
      mx: 1.5,
      my: 0.25,
      borderRadius: 2,
      color: alpha('#ffffff', 0.85),
      '& .MuiListItemIcon-root': { color: alpha('#ffffff', 0.7), minWidth: 40 },
      '&:hover': { background: alpha('#ffffff', 0.08) },
      '&.Mui-selected': {
        background: alpha('#ffffff', 0.16),
        color: '#ffffff',
        '& .MuiListItemIcon-root': { color: '#ffffff' },
        '&:hover': { background: alpha('#ffffff', 0.2) },
      },
    },
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ gap: 1.5 }}>
        <AccountBalanceIcon sx={{ color: '#ffffff' }} />
        <Typography variant="h6" noWrap sx={{ color: '#ffffff', fontWeight: 700 }}>
          ORA Platform
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: alpha('#ffffff', 0.12) }} />
      <Box sx={{ overflowY: 'auto', flexGrow: 1, py: 1 }}>
        <List sx={navListSx}>
          {primaryNavItems.map((item) => (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              selected={isSelected(item.to)}
              onClick={handleNavClick}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        {isAdmin && (
          <>
            <Divider sx={{ borderColor: alpha('#ffffff', 0.12), my: 1 }} />
            <List
              sx={navListSx}
              subheader={
                <Typography
                  variant="overline"
                  sx={{ pl: 3, display: 'block', pt: 1, color: alpha('#ffffff', 0.55), letterSpacing: '0.08em' }}
                >
                  Administration
                </Typography>
              }
            >
              {adminNavItems.map((item) => (
                <ListItemButton key={item.to} component={RouterLink} to={item.to} selected={isSelected(item.to)} onClick={handleNavClick}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
        {managedModules.length > 0 && (
          <>
            <Divider sx={{ borderColor: alpha('#ffffff', 0.12), my: 1 }} />
            <List
              sx={navListSx}
              subheader={
                <Tooltip
                  title="Each module manages its own roles independently — see docs/01-architecture.md §2a. Content management (submissions, cataloging, etc.) isn't built yet."
                  placement="right"
                >
                  <Typography
                    variant="overline"
                    sx={{ pl: 3, display: 'block', pt: 1, color: alpha('#ffffff', 0.55), letterSpacing: '0.08em' }}
                  >
                    Module roles
                  </Typography>
                </Tooltip>
              }
            >
              {moduleNavItems.map((item) => (
                <ListItemButton
                  key={item.to}
                  component={RouterLink}
                  to={item.to}
                  selected={location.pathname === item.to}
                  onClick={handleNavClick}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          backgroundImage: gradients.primary,
          ...glass.onBrand,
          boxShadow: (t) => `0 4px 24px ${alpha(t.palette.primary.dark, 0.25)}`,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen((open) => !open)}
            sx={{ mr: 2, display: { md: 'none' } }}
            aria-label="toggle navigation"
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, fontWeight: 700, display: { xs: 'block', md: 'none' } }}
          >
            ORA Platform
          </Typography>
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }} />
          <Tooltip title="Notifications">
            <IconButton color="inherit" component={RouterLink} to="/notifications" aria-label="notifications">
              <Badge badgeContent={unreadCount ?? 0} color="secondary" max={99}>
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Account">
            <IconButton onClick={openMenu} sx={{ ml: 1 }} aria-label="account menu" data-testid="account-menu-button">
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 14 }}>
                {initials || <PersonIcon fontSize="small" />}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
            <MenuItem component={RouterLink} to="/profile" onClick={closeMenu}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} data-testid="logout-menu-item">
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Log out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Desktop: permanent glass sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
            backgroundImage: gradients.primary,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Mobile / tablet: temporary glass sidebar, toggled from the AppBar */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
            backgroundImage: gradients.primary,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          px: { xs: 2, sm: 3, md: 4 },
          pb: { xs: 2, sm: 3 },
        }}
      >
        <Toolbar />
        <Box sx={{ flexGrow: 1, pt: { xs: 2, sm: 3 } }}>
          <Outlet />
        </Box>
        <Footer />
      </Box>
    </Box>
  );
}

export default DashboardLayout;
