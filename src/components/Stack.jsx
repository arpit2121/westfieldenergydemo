import { Stack as MuiStack } from '@mui/material';

// MUI v9 no longer forwards layout shorthands on Stack; map them into sx.
export default function Stack({ alignItems, justifyContent, sx, ...rest }) {
  return <MuiStack {...rest} sx={{ alignItems, justifyContent, ...(sx || {}) }} />;
}
