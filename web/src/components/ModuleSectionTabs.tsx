import { Link as RouterLink } from 'react-router-dom';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

/**
 * Switches between a module's two separate full pages — Role catalog and
 * Member roles — now that they're no longer squeezed into one page as
 * side-by-side panels. Each tab is a real route (not client-only state),
 * so the URL, back button, and page refresh all behave normally.
 */
export function ModuleSectionTabs({ moduleKey, active }: { moduleKey: string; active: 'roles' | 'members' }) {
  return (
    <Tabs value={active} sx={{ mb: 3 }}>
      <Tab label="Role catalog" value="roles" component={RouterLink} to={`/admin/modules/${moduleKey}/roles`} />
      <Tab label="Member roles" value="members" component={RouterLink} to={`/admin/modules/${moduleKey}/members`} />
    </Tabs>
  );
}

export default ModuleSectionTabs;
