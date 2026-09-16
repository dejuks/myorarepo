import { createTheme } from '@mui/material/styles';

/**
 * ORA is a scholarly/library platform — the palette aims for calm,
 * trustworthy and legible, not flashy. Deep ink-blue as the primary,
 * a warm parchment/gold accent as secondary, plenty of whitespace.
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2b3a55',
      light: '#4f5f7d',
      dark: '#1a2438',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#b8863f',
      light: '#d3a565',
      dark: '#8f6528',
      contrastText: '#1a2438',
    },
    background: {
      default: '#f7f6f2',
      paper: '#ffffff',
    },
    error: {
      main: '#b3261e',
    },
    success: {
      main: '#2e7d32',
    },
    text: {
      primary: '#1c1c1e',
      secondary: '#565a63',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: ['"Inter"', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
    },
  },
});

export default theme;
