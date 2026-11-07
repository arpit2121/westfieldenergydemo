import { createTheme, alpha } from '@mui/material/styles';

// Monochrome ERP theme: black / white / greys, compact density, small type.
// The only colour is semantic (status, T-tier chips) and kept muted.
const ink = '#111111';
const grey = {
  50: '#FAFAFA',
  100: '#F4F4F5',
  200: '#E4E4E7',
  300: '#D4D4D8',
  400: '#A1A1AA',
  500: '#71717A',
  600: '#52525B',
  700: '#3F3F46',
  800: '#27272A',
  900: '#18181B',
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: ink, contrastText: '#fff' },
    secondary: { main: grey[600] },
    grey,
    text: { primary: ink, secondary: grey[500] },
    divider: grey[200],
    background: { default: '#F6F6F7', paper: '#FFFFFF' },
    success: { main: '#1F7A4D' },
    warning: { main: '#A15C07' },
    error: { main: '#B42318' },
    info: { main: grey[700] },
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: 12,
    htmlFontSize: 16,
    h1: { fontSize: 20, fontWeight: 600, letterSpacing: -0.2 },
    h2: { fontSize: 17, fontWeight: 600, letterSpacing: -0.1 },
    h3: { fontSize: 15, fontWeight: 600 },
    h4: { fontSize: 14, fontWeight: 600 },
    h5: { fontSize: 13, fontWeight: 600 },
    h6: { fontSize: 12.5, fontWeight: 600 },
    subtitle1: { fontSize: 12.5, fontWeight: 600 },
    subtitle2: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: grey[500] },
    body1: { fontSize: 12.5 },
    body2: { fontSize: 12 },
    caption: { fontSize: 11, color: grey[500] },
    overline: { fontSize: 10, fontWeight: 600, letterSpacing: 0.8, lineHeight: 1.6 },
    button: { fontSize: 12, fontWeight: 500, textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#F6F6F7', WebkitFontSmoothing: 'antialiased' },
        '*::-webkit-scrollbar': { width: 8, height: 8 },
        '*::-webkit-scrollbar-thumb': { background: grey[300], borderRadius: 8 },
        '@media print': { '.no-print': { display: 'none !important' } },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, size: 'small' },
      styleOverrides: {
        root: { borderRadius: 4, padding: '4px 12px', minHeight: 28, lineHeight: 1.5 },
        sizeSmall: { padding: '3px 10px' },
        outlined: { borderColor: grey[300], color: ink, '&:hover': { borderColor: ink, background: grey[50] } },
        startIcon: { marginRight: 6, '& > *:nth-of-type(1)': { fontSize: 16 } },
      },
    },
    MuiIconButton: { defaultProps: { size: 'small' } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true, variant: 'outlined' } },
    MuiFormControl: { defaultProps: { size: 'small' } },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiInputLabel: { styleOverrides: { root: { fontSize: 12 }, shrink: { fontSize: 12 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontSize: 12.5,
          background: '#fff',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: grey[300] },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: grey[500] },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: ink, borderWidth: 1 },
          '&.Mui-disabled': { background: grey[50] },
        },
        input: { padding: '7px 10px' },
        inputSizeSmall: { padding: '6px 10px' },
      },
    },
    MuiMenuItem: { styleOverrides: { root: { fontSize: 12.5, minHeight: 30 } } },
    MuiListItemText: { styleOverrides: { primary: { fontSize: 12.5 }, secondary: { fontSize: 11 } } },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' }, outlined: { borderColor: grey[200] } },
    },
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiChip: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { borderRadius: 3, fontWeight: 500, fontSize: 11, height: 20 },
        label: { paddingLeft: 6, paddingRight: 6 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { fontSize: 12, padding: '6px 10px', borderColor: grey[200], whiteSpace: 'nowrap' },
        head: { fontSize: 10.5, fontWeight: 600, color: grey[500], textTransform: 'uppercase', letterSpacing: 0.5, background: grey[50] },
      },
    },
    MuiTableRow: {
      styleOverrides: { root: { '&.MuiTableRow-hover:hover': { backgroundColor: grey[50] } } },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 34 },
        indicator: { backgroundColor: ink, height: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { minHeight: 34, padding: '6px 12px', fontSize: 12, minWidth: 0, color: grey[500], '&.Mui-selected': { color: ink, fontWeight: 600 } },
      },
    },
    MuiTooltip: { styleOverrides: { tooltip: { fontSize: 11, background: ink } } },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: 14, fontWeight: 600, padding: '14px 18px' } } },
    MuiDialogContent: { styleOverrides: { root: { padding: '8px 18px' } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '10px 18px' } } },
    MuiAlert: { styleOverrides: { root: { fontSize: 12, padding: '2px 12px' } } },
    MuiStepLabel: { styleOverrides: { label: { fontSize: 11.5 } } },
    MuiLinearProgress: { styleOverrides: { root: { height: 4, borderRadius: 2, background: grey[200] }, bar: { background: ink } } },
    MuiSwitch: { defaultProps: { size: 'small' } },
    MuiCheckbox: { defaultProps: { size: 'small' } },
    MuiRadio: { defaultProps: { size: 'small' } },
    MuiFormControlLabel: { styleOverrides: { label: { fontSize: 12.5 } } },
    MuiBadge: { styleOverrides: { badge: { fontSize: 10, height: 16, minWidth: 16, padding: '0 4px' } } },
    MuiAvatar: { styleOverrides: { root: { fontSize: 11, fontWeight: 600 } } },
  },
});

export const tint = (c, a = 0.1) => alpha(c, a);
