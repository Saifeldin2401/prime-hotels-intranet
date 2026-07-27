import type { ButtonBaseProps } from '@mui/material/ButtonBase';

import { useEffect, useState, useCallback } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import MenuList from '@mui/material/MenuList';
import ButtonBase from '@mui/material/ButtonBase';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';

import { Label } from '@/phg-kit/components/label';
import { Iconify } from '@/phg-kit/components/iconify';

// ----------------------------------------------------------------------

export type WorkspacesPopoverProps = ButtonBaseProps & {
  data?: {
    id: string;
    name: string;
    logo: string;
    plan: string;
  }[];
  value?: string;
  onChangeWorkspace?: (id: string) => void;
};

export function WorkspacesPopover({ data = [], value, onChangeWorkspace, sx, ...other }: WorkspacesPopoverProps) {
  const [workspace, setWorkspace] = useState(data.find((item) => item.id === value) ?? data[0]);

  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(null);

  const handleOpenPopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setOpenPopover(event.currentTarget);
  }, []);

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const handleChangeWorkspace = useCallback(
    (newValue: (typeof data)[number]) => {
      setWorkspace(newValue);
      onChangeWorkspace?.(newValue.id);
      handleClosePopover();
    },
    [handleClosePopover, onChangeWorkspace]
  );

  useEffect(() => {
    setWorkspace(data.find((item) => item.id === value) ?? data[0]);
  }, [data, value]);

  const renderAvatar = (alt: string, src: string) => (
    <Box component="img" alt={alt} src={src} sx={{ width: 24, height: 24, borderRadius: '6px', objectFit: 'contain' }} />
  );

  const renderLabel = (plan: string) => (
    <Label color={plan === 'Free' ? 'default' : 'info'}>{plan}</Label>
  );

  return (
    <>
      <ButtonBase
        disableRipple
        onClick={handleOpenPopover}
        sx={{
          pl: 2,
          py: 3,
          gap: 1.5,
          pr: 1.5,
          width: 1,
          borderRadius: 1.5,
          textAlign: 'left',
          justifyContent: 'flex-start',
          bgcolor: (theme) => varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
          ...sx,
        }}
        {...other}
      >
        {renderAvatar(workspace?.name, workspace?.logo)}

        <Box
          sx={{
            gap: 1,
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            typography: 'body2',
            fontWeight: 'fontWeightSemiBold',
            minWidth: 0,
          }}
        >
          <Box component="span" sx={{ flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {workspace?.name}
          </Box>
          {renderLabel(workspace?.plan)}
        </Box>

        <Iconify width={16} icon="carbon:chevron-sort" sx={{ color: 'text.disabled' }} />
      </ButtonBase>

      <Popover open={!!openPopover} anchorEl={openPopover} onClose={handleClosePopover}>
        <MenuList
          disablePadding
          sx={{
            p: 0.5,
            gap: 0.5,
            minWidth: 320,
            maxWidth: 400,
            display: 'flex',
            flexDirection: 'column',
            [`& .${menuItemClasses.root}`]: {
              p: 1.5,
              gap: 1.5,
              borderRadius: 0.75,
              [`&.${menuItemClasses.selected}`]: {
                bgcolor: 'action.selected',
                fontWeight: 'fontWeightSemiBold',
              },
            },
          }}
        >
          {data.map((option) => (
            <MenuItem
              key={option.id}
              selected={option.id === workspace?.id}
              onClick={() => handleChangeWorkspace(option)}
            >
              {renderAvatar(option.name, option.logo)}

              <Box component="span" sx={{ flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {option.name}
              </Box>

              {renderLabel(option.plan)}
            </MenuItem>
          ))}
        </MenuList>
      </Popover>
    </>
  );
}
