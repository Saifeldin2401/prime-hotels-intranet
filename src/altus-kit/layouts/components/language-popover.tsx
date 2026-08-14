import type { IconButtonProps } from '@mui/material/IconButton';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import MenuList from '@mui/material/MenuList';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from '@/altus-kit/components/iconify';

// ----------------------------------------------------------------------

const LANGUAGES = [
  {
    value: 'en',
    label: 'English',
    country: 'United States',
    flag: '🇺🇸',
    icon: 'twemoji:flag-united-states',
  },
  {
    value: 'ar',
    label: 'العربية',
    country: 'Saudi Arabia',
    flag: '🇸🇦',
    icon: 'twemoji:flag-saudi-arabia',
  },
];

// ----------------------------------------------------------------------

export type LanguagePopoverProps = IconButtonProps & {
  data?: typeof LANGUAGES;
};

export function LanguagePopover({ data = LANGUAGES, sx, ...other }: LanguagePopoverProps) {
  const { i18n } = useTranslation();
  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(null);

  const currentLang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const selectedLang = data.find((option) => option.value === currentLang) || data[0];

  const handleOpenPopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setOpenPopover(event.currentTarget);
  }, []);

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const handleChangeLang = useCallback(
    (newLang: string) => {
      i18n.changeLanguage(newLang).catch((err) => {
        console.error('Failed to change language:', err);
      });
      handleClosePopover();
    },
    [handleClosePopover, i18n]
  );

  return (
    <>
      <IconButton
        onClick={handleOpenPopover}
        sx={{
          p: 0.75,
          width: 40,
          height: 40,
          borderRadius: '50%',
          transition: (theme) => theme.transitions.create(['background-color', 'transform']),
          '&:hover': {
            bgcolor: 'action.hover',
            transform: 'scale(1.05)',
          },
          ...(openPopover && {
            bgcolor: 'action.selected',
          }),
          ...sx,
        }}
        aria-label="Switch language"
        {...other}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            lineHeight: 1,
          }}
        >
          <span role="img" aria-label={selectedLang.label}>
            {selectedLang.flag}
          </span>
        </Box>
      </IconButton>

      <Popover
        open={!!openPopover}
        anchorEl={openPopover}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              p: 0.75,
              width: 180,
              borderRadius: 2,
              boxShadow: (theme) => theme.customShadows?.dropdown || 8,
              border: (theme) => `1px solid ${theme.palette.divider}`,
            },
          },
        }}
      >
        <MenuList
          disablePadding
          sx={{
            [`& .${menuItemClasses.root}`]: {
              px: 1.5,
              py: 1,
              gap: 1.5,
              borderRadius: 1,
              typography: 'body2',
              fontWeight: 500,
              '&.Mui-selected': {
                fontWeight: 700,
                bgcolor: 'action.selected',
              },
            },
          }}
        >
          {data.map((option) => {
            const isSelected = option.value === currentLang;
            return (
              <MenuItem
                key={option.value}
                selected={isSelected}
                onClick={() => handleChangeLang(option.value)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography component="span" sx={{ fontSize: 18, lineHeight: 1 }}>
                    {option.flag}
                  </Typography>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 500, lineHeight: 1.2 }}>
                      {option.label}
                    </Typography>
                  </Box>
                </Box>
                {isSelected && (
                  <Iconify icon="solar:check-circle-bold" sx={{ width: 18, height: 18, color: 'primary.main' }} />
                )}
              </MenuItem>
            );
          })}
        </MenuList>
      </Popover>
    </>
  );
}
