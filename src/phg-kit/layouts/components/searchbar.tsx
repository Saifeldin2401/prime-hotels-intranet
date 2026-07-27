import type { BoxProps } from '@mui/material/Box';

import { useState, useCallback } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Slide from '@mui/material/Slide';
import Input from '@mui/material/Input';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import InputAdornment from '@mui/material/InputAdornment';
import ClickAwayListener from '@mui/material/ClickAwayListener';

import { Iconify } from '@/phg-kit/components/iconify';

// ----------------------------------------------------------------------

type SearchbarProps = BoxProps & {
  onCommandOpen?: () => void;
};

export function Searchbar({ sx, onCommandOpen, ...other }: SearchbarProps) {
  const theme = useTheme();

  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(() => {
    if (onCommandOpen) {
      onCommandOpen();
      return;
    }
    setOpen((prev) => !prev);
  }, [onCommandOpen]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <div>
        {!open && (
          <Box
            onClick={handleOpen}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.75,
              borderRadius: 1.5,
              bgcolor: (theme) => varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
              color: 'text.secondary',
              cursor: 'pointer',
              transition: (theme) => theme.transitions.create(['background-color', 'color']),
              '&:hover': {
                bgcolor: (theme) => varAlpha(theme.vars.palette.grey['500Channel'], 0.16),
                color: 'text.primary',
              },
            }}
          >
            <Iconify icon="eva:search-fill" width={18} />
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, typography: 'body2', fontSize: '0.8125rem' }}>
              Search...
            </Box>
            <Box
              component="kbd"
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                alignItems: 'center',
                justifyContent: 'center',
                px: 0.75,
                py: 0.25,
                borderRadius: 0.75,
                fontSize: '0.6875rem',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                bgcolor: (theme) => varAlpha(theme.vars.palette.grey['500Channel'], 0.16),
                color: 'text.secondary',
                border: (theme) => `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.2)}`,
              }}
            >
              ⌘K
            </Box>
          </Box>
        )}

        <Slide direction="down" in={open} mountOnEnter unmountOnExit>
          <Box
            sx={{
              top: 0,
              left: 0,
              zIndex: 99,
              width: '100%',
              display: 'flex',
              position: 'absolute',
              alignItems: 'center',
              px: { xs: 3, md: 5 },
              boxShadow: theme.vars.customShadows.z8,
              height: {
                xs: 'var(--layout-header-mobile-height)',
                md: 'var(--layout-header-desktop-height)',
              },
              backdropFilter: `blur(6px)`,
              WebkitBackdropFilter: `blur(6px)`,
              backgroundColor: varAlpha(theme.vars.palette.background.defaultChannel, 0.8),
              ...sx,
            }}
            {...other}
          >
            <Input
              autoFocus
              fullWidth
              disableUnderline
              placeholder="Search…"
              startAdornment={
                <InputAdornment position="start">
                  <Iconify width={20} icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              }
              sx={{ fontWeight: 'fontWeightBold' }}
            />
            <Button variant="contained" onClick={handleClose}>
              Search
            </Button>
          </Box>
        </Slide>
      </div>
    </ClickAwayListener>
  );
}
