import { useState } from 'react';
import type { ReactNode, MouseEvent } from 'react';
import { Link as RouterLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { logout as logoutRequest } from '@/api/authApi';
import { loggedOut } from '@/features/auth/authSlice';
import { MODULES } from '@/config/modules';

const DRAWER_WIDTH = 240;

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
];

const adminNavItems: NavItem[] = [
  { label: 'Users', to: '/admin/users', icon: <PeopleAltIcon /> },
  { label: 'Roles', to: '/admin/roles', icon: <AdminPanelSettingsIcon /> },
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
 */
const moduleNavItems: NavItem[] = MODULES.map((mod) => ({
  label: `${mod.label} — Roles`,
  to: `/admin/modules/${mod.key}`,
  icon: moduleIcons[mod.key] ?? <ArticleIcon />,
}));

export function DashboardLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const refreshToken = useAppSelector((state) => state.auth.refreshToken);
  const { data: unreadCount } = useUnreadCount();
  const { data: currentUser } = useCurrentUser();
  const isAdmin = useIsAdmin();

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

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

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" color="primary" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            ORA Platform
          </Typography>
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

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {primaryNavItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={RouterLink}
                to={item.to}
                selected={location.pathname === item.to}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
          {isAdmin && (
            <>
              <Divider />
              <List
                subheader={
                  <Typography variant="overline" color="text.secondary" sx={{ pl: 2, display: 'block', pt: 1 }}>
                    Administration
                  </Typography>
                }
              >
                {adminNavItems.map((item) => (
                  <ListItemButton
                    key={item.to}
                    component={RouterLink}
                    to={item.to}
                    selected={location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                ))}
              </List>
            </>
          )}
          {isAdmin && (
            <>
              <Divider />
              <List
                subheader={
                  <Tooltip
                    title="Each module manages its own roles independently — see docs/01-architecture.md §2a. Content management (submissions, cataloging, etc.) isn't built yet."
                    placement="right"
                  >
                    <Typography variant="overline" color="text.secondary" sx={{ pl: 2, display: 'block', pt: 1 }}>
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
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                ))}
              </List>
            </>
          )}
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh', p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

export default DashboardLayout;
