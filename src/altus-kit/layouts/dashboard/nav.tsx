import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';

import { useEffect, useState, Fragment } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ListItem from '@mui/material/ListItem';
import Collapse from '@mui/material/Collapse';
import { useTheme } from '@mui/material/styles';
import ListItemButton from '@mui/material/ListItemButton';
import Drawer, { drawerClasses } from '@mui/material/Drawer';
import { ChevronDown } from 'lucide-react';

import { usePathname } from '@/altus-kit/routes/hooks';
import { RouterLink } from '@/altus-kit/routes/components';

import { Logo } from '@/altus-kit/components/logo';
import { Scrollbar } from '@/altus-kit/components/scrollbar';

import { WorkspacesPopover } from '../components/workspaces-popover';

import type { NavItem, NavGroupData } from '../nav-config-dashboard';
import type { WorkspacesPopoverProps } from '../components/workspaces-popover';

// ----------------------------------------------------------------------

export type NavContentProps = {
  data: NavItem[];
  groupedData?: NavGroupData[];
  currentWorkspaceId?: string;
  onChangeWorkspace?: (id: string) => void;
  slots?: {
    topArea?: React.ReactNode;
    bottomArea?: React.ReactNode;
  };
  workspaces: WorkspacesPopoverProps['data'];
  sx?: SxProps<Theme>;
};

export function NavDesktop({
  sx,
  data,
  groupedData,
  slots,
  workspaces,
  layoutQuery,
  currentWorkspaceId,
  onChangeWorkspace,
}: NavContentProps & { layoutQuery: Breakpoint }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        pt: 2.5,
        px: 2.5,
        top: 0,
        left: 0,
        height: 1,
        display: 'none',
        position: 'fixed',
        flexDirection: 'column',
        zIndex: 'var(--layout-nav-zIndex)',
        width: 'var(--layout-nav-vertical-width)',
        borderRight: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}`,
        [theme.breakpoints.up(layoutQuery)]: {
          display: 'flex',
        },
        ...sx,
      }}
    >
      <NavContent
        data={data}
        groupedData={groupedData}
        slots={slots}
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        onChangeWorkspace={onChangeWorkspace}
      />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function NavMobile({
  sx,
  data,
  groupedData,
  open,
  slots,
  onClose,
  workspaces,
  currentWorkspaceId,
  onChangeWorkspace,
}: NavContentProps & { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      sx={{
        [`& .${drawerClasses.paper}`]: {
          pt: 2.5,
          px: 2.5,
          overflow: 'unset',
          width: 'var(--layout-nav-mobile-width)',
          ...sx,
        },
      }}
    >
      <NavContent
        data={data}
        groupedData={groupedData}
        slots={slots}
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        onChangeWorkspace={onChangeWorkspace}
      />
    </Drawer>
  );
}

// ----------------------------------------------------------------------

function NavGroupAccordion({ group, pathname }: { group: NavGroupData; pathname: string }) {
  const hasActiveItem = group.items.some(
    (item) => item.path === pathname || (item.path !== '/' && pathname.startsWith(`${item.path}/`))
  );
  const [open, setOpen] = useState(hasActiveItem || !group.collapsible);
  const totalBadges = group.items.reduce((acc, curr) => acc + (curr.badgeCount || 0), 0);

  useEffect(() => {
    if (hasActiveItem) {
      setOpen(true);
    }
  }, [hasActiveItem]);

  if (group.items.length === 0) return null;

  if (!group.collapsible) {
    return (
      <Box component="li" sx={{ listStyle: 'none', mb: 1 }}>
        {group.items.map((item, index) => {
          const isActived = item.path === pathname || (item.path !== '/' && pathname.startsWith(`${item.path}/`));
          return (
            <ListItem disableGutters disablePadding key={`${item.title}-${index}`}>
              <ListItemButton
                disableGutters
                component={RouterLink}
                href={item.path}
                sx={(theme) => ({
                  pl: 2,
                  py: 1,
                  gap: 2,
                  pr: 1.5,
                  borderRadius: 0.75,
                  typography: 'body2',
                  fontWeight: 'fontWeightMedium',
                  color: theme.vars.palette.text.secondary,
                  minHeight: 44,
                  ...(isActived && {
                    fontWeight: 'fontWeightSemiBold',
                    color: theme.vars.palette.primary.main,
                    bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
                    '&:hover': {
                      bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.16),
                    },
                  }),
                })}
              >
                <Box component="span" sx={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </Box>
                <Box component="span" sx={{ flexGrow: 1 }}>
                  {item.title}
                </Box>
                {item.badgeCount && item.badgeCount > 0 && (
                  <Box sx={{ px: 1, py: 0.25, borderRadius: 1, fontSize: '0.75rem', fontWeight: 'bold', bgcolor: 'error.main', color: 'common.white' }}>
                    {item.badgeCount > 99 ? '99+' : item.badgeCount}
                  </Box>
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </Box>
    );
  }

  return (
    <Box component="li" sx={{ listStyle: 'none', mb: 1.5 }}>
      <ListItemButton
        onClick={() => setOpen((prev) => !prev)}
        sx={(theme) => ({
          pl: 1.5,
          py: 0.75,
          pr: 1,
          borderRadius: 0.75,
          color: hasActiveItem ? theme.vars.palette.primary.main : theme.vars.palette.text.primary,
          fontWeight: hasActiveItem ? 'fontWeightBold' : 'fontWeightMedium',
          bgcolor: hasActiveItem ? varAlpha(theme.vars.palette.primary.mainChannel, 0.06) : 'transparent',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        })}
      >
        {group.icon && (
          <Box component="span" sx={{ width: 20, height: 20, mr: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasActiveItem ? 'primary.main' : 'text.secondary' }}>
            {group.icon}
          </Box>
        )}
        <Box
          component="span"
          sx={{
            flexGrow: 1,
            typography: 'caption',
            fontWeight: 'fontWeightBold',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: '0.72rem',
          }}
        >
          {group.title}
        </Box>
        {totalBadges > 0 && (
          <Box sx={{ mr: 1, px: 0.75, py: 0.15, borderRadius: 1, fontSize: '0.6875rem', fontWeight: 'bold', bgcolor: 'error.main', color: 'common.white' }}>
            {totalBadges}
          </Box>
        )}
        <ChevronDown
          size={16}
          style={{
            transition: 'transform 0.2s',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            opacity: 0.6,
          }}
        />
      </ListItemButton>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box
          component="ul"
          sx={{
            pl: 1.5,
            mt: 0.5,
            gap: 0.25,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: (theme) => `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}`,
            ml: 2.25,
          }}
        >
          {group.items.map((item, index) => {
            const isActived = item.path === pathname || (item.path !== '/' && pathname.startsWith(`${item.path}/`));
            return (
              <ListItem disableGutters disablePadding key={`${item.title}-${index}`}>
                <ListItemButton
                  disableGutters
                  component={RouterLink}
                  href={item.path}
                  sx={(theme) => ({
                    pl: 2,
                    py: 0.75,
                    gap: 1.5,
                    pr: 1.5,
                    borderRadius: 0.75,
                    typography: 'body2',
                    fontSize: '0.8125rem',
                    fontWeight: isActived ? 'fontWeightSemiBold' : 'fontWeightRegular',
                    color: isActived ? theme.vars.palette.primary.main : theme.vars.palette.text.secondary,
                    minHeight: 38,
                    ...(isActived && {
                      bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
                      '&:hover': {
                        bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.16),
                      },
                    }),
                  })}
                >
                  <Box component="span" sx={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isActived ? 1 : 0.7 }}>
                    {item.icon}
                  </Box>
                  <Box component="span" sx={{ flexGrow: 1 }}>
                    {item.title}
                  </Box>
                  {item.badgeCount && item.badgeCount > 0 && (
                    <Box sx={{ px: 0.75, py: 0.15, borderRadius: 1, fontSize: '0.6875rem', fontWeight: 'bold', bgcolor: 'error.main', color: 'common.white' }}>
                      {item.badgeCount > 99 ? '99+' : item.badgeCount}
                    </Box>
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function NavContent({ data, groupedData, slots, workspaces, currentWorkspaceId, onChangeWorkspace, sx }: NavContentProps) {
  const pathname = usePathname();

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2.5, py: 2 }}>
        <Logo />
        <Typography
          variant="subtitle1"
          sx={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: 'text.primary',
            lineHeight: 1.1,
          }}
        >
          Altus Connect
        </Typography>
      </Box>

      {slots?.topArea}

      <WorkspacesPopover
        data={workspaces}
        value={currentWorkspaceId}
        onChangeWorkspace={onChangeWorkspace}
        sx={{ my: 2 }}
      />

      <Scrollbar fillContent>
        <Box
          component="nav"
          sx={[
            {
              display: 'flex',
              flex: '1 1 auto',
              flexDirection: 'column',
            },
            ...(Array.isArray(sx) ? sx : [sx]),
          ]}
        >
          <Box
            component="ul"
            sx={{
              gap: 0.5,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {groupedData && groupedData.length > 0 ? (
              groupedData.map((group) => (
                <NavGroupAccordion key={group.id} group={group} pathname={pathname} />
              ))
            ) : (
              data.map((item, index) => {
                const isActived = item.path === pathname || (item.path !== '/' && pathname.startsWith(`${item.path}/`));

                return (
                  <Fragment key={`${item.title}-${item.path}-${index}`}>
                    {item.subheader && (
                      <Box
                        component="li"
                        sx={{
                          pt: index === 0 ? 1 : 2.5,
                          pb: 0.75,
                          px: 1.5,
                          typography: 'caption',
                          fontWeight: 'fontWeightBold',
                          color: 'text.disabled',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          fontSize: '0.6875rem',
                          listStyle: 'none',
                        }}
                      >
                        {item.subheader}
                      </Box>
                    )}
                    <ListItem disableGutters disablePadding>
                      <ListItemButton
                        disableGutters
                        component={RouterLink}
                        href={item.path}
                        sx={[
                          (theme) => ({
                            pl: 2,
                            py: 1,
                            gap: 2,
                            pr: 1.5,
                            borderRadius: 0.75,
                            typography: 'body2',
                            fontWeight: 'fontWeightMedium',
                            color: theme.vars.palette.text.secondary,
                            minHeight: 44,
                            ...(isActived && {
                              fontWeight: 'fontWeightSemiBold',
                              color: theme.vars.palette.primary.main,
                              bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
                              '&:hover': {
                                bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.16),
                              },
                            }),
                          }),
                        ]}
                      >
                        <Box component="span" sx={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {item.icon}
                        </Box>

                        <Box component="span" sx={{ flexGrow: 1 }}>
                          {item.title}
                        </Box>

                        {item.badgeCount && item.badgeCount > 0 ? (
                          <Box
                            component="span"
                            sx={{
                              px: 1,
                              py: 0.25,
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              bgcolor: 'error.main',
                              color: 'common.white',
                            }}
                          >
                            {item.badgeCount > 99 ? '99+' : item.badgeCount}
                          </Box>
                        ) : (
                          item.info && item.info
                        )}
                      </ListItemButton>
                    </ListItem>
                  </Fragment>
                );
              })
            )}
          </Box>
        </Box>
      </Scrollbar>

      {slots?.bottomArea}
    </>
  );
}

