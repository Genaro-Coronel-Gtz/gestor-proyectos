import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
    primary: {
      main: '#4C9A2A',
    },
    secondary: {
      main: '#f50057',
    },
  },
  shape: {
    borderRadius: 8,
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    primary: {
      main: '#4C9A2A',
    },
    secondary: {
      main: '#f48fb1',
    },
  },
  shape: {
    borderRadius: 8,
  },
});
