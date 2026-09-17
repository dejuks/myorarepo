import { createTheme, alpha } from '@mui/material/styles';

/**
 * Glass UI theme. Primary is a deep wine/maroon gradient (matches the brand
 * reference: light magenta-wine fading to near-black), used both as the
 * solid `primary` palette color and as `gradients.primary` for surfaces that
 * want the actual gradient (AppBar, sidebar, hero panels, chart accents).
 * Frosted-glass surfaces (`glass.*` below) are translucent + blurred panels
 * that float on top of `background.default`'s soft gradient wash — see
 * `MuiCssBaseline` overrides at the bottom of this file for that backdrop.
 */
const WINE_LIGHT = '#7a2049';
const WINE_MAIN = '#5c1233';
const WINE_DARK = '#1f0a15';

export const gradients = {
  /** The brand reference gradient itself — AppBar, sidebar, buttons that want the full effect. */
  primary: `linear-gradient(135deg, ${WINE_LIGHT} 0%, ${WINE_MAIN} 55%, ${WINE_DARK} 100%)`,
  /** Soft, low-opacity wash for page backgrounds behind glass panels. */
  page: `radial-gradient(circle at 15% -10%, ${alpha(WINE_LIGHT, 0.16)} 0%, transparent 45%),
         radial-gradient(circle at 100% 0%, ${alpha('#8f6528', 0.12)} 0%, transparent 40%),
         radial-gradient(circle at 90% 100%, ${alpha(WINE_MAIN, 0.1)} 0%, transparent 45%),
         #f4f1ee`,
};

/** Reusable frosted-glass surface tokens — spread into `sx` on any card/panel that wants the effect. */
export const glass = {
  surface: {
    background: alpha('#ffffff', 0.62),
    backdropFilter: 'blur(18px) saturate(160%)',
    WebkitBackdropFilter: 'blur(18px) saturate(160%)',
    border: `1px solid ${alpha('#ffffff', 0.5)}`,
    boxShadow: `0 8px 32px ${alpha(WINE_DARK, 0.1)}`,
  },
  /** Darker/tinted glass for surfaces sitting on the wine gradient itself (AppBar, sidebar). */
  onBrand: {
    background: alpha('#ffffff', 0.08),
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: `1px solid ${alpha('#ffffff', 0.12)}`,
  },
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: WINE_MAIN,
      light: WINE_LIGHT,
      dark: WINE_DARK,
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#b8863f',
      light: '#d3a565',
      dark: '#8f6528',
      contrastText: '#1a2438',
    },
    background: {
      default: '#f4f1ee',
      paper: alpha('#ffffff', 0.7),
    },
    error: {
      main: '#b3261e',
    },
    success: {
      main: '#2e7d32',
    },
    text: {
      primary: '#241019',
      secondary: '#6b5561',
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: ['"Inter"', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: gradients.page,
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        containedPrimary: {
          backgroundImage: gradients.primary,
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
    },
    MuiPaper: {
      styleOverrides: {
        outlined: {
          background: alpha('#ffffff', 0.72),
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderColor: alpha(WINE_MAIN, 0.14),
        },
      },
    },
    /**
     * `background.paper` (used by MuiPaper's default "elevation" variant,
     * which Dialog/Menu/Select/Autocomplete popups all render on) is a
     * translucent 70%-opacity white, which reads fine for in-page cards
     * sitting on the page's own soft gradient — but a modal floats over
     * whatever page content is directly behind it, and at 70% opacity that
     * content shows through clearly enough to visually collide with the
     * dialog's own text (e.g. two overlapping paragraphs becoming
     * illegible). Dialogs specifically need a solid, opaque surface —
     * unlike page-content Paper/Card surfaces, translucency here is a
     * legibility bug, not part of the glass aesthetic.
     */
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: '#fdfbfa',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          background: alpha(WINE_MAIN, 0.06),
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          fontWeight: 700,
          fontSize: '0.72rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: WINE_DARK,
          position: 'sticky',
          top: 0,
          zIndex: 1,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;
