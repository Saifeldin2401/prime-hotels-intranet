import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';

import { useEffect, useState, useMemo, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ListItem from '@mui/material/ListItem';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import ListItemButton from '@mui/material/ListItemButton';
import Drawer, { drawerClasses } from '@mui/material/Drawer';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import { ChevronDown, Search, X, Star, PanelLeftClose, PanelLeftOpen, ChevronLeft, ChevronRight } from 'lucide-react';

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
  favoriteItems?: NavItem[];
  currentWorkspaceId?: string;
  onChangeWorkspace?: (id: string) => void;
  onCommandOpen?: () => void;
  isMini?: boolean;
  onToggleMini?: () => void;
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
  favoriteItems,
  slots,
  workspaces,
  layoutQuery,
  currentWorkspaceId,
  onChangeWorkspace,
  onCommandOpen,
  isMini = false,
  onToggleMini,
}: NavContentProps & { layoutQuery: Breakpoint; isMini?: boolean; onToggleMini?: () => void }) {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl' || i18n.language?.startsWith('ar') || theme.direction === 'rtl';

  return (
    <Box
      sx={{
        pt: 2,
        px: isMini ? 1 : 2,
        top: 0,
        ...(isRtl
          ? {
              right: 0,
              left: 'auto',
              borderLeft: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}`,
              borderRight: 'none',
            }
          : {
              left: 0,
              right: 'auto',
              borderRight: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}`,
              borderLeft: 'none',
            }),
        height: 1,
        display: 'none',
        position: 'fixed',
        flexDirection: 'column',
        zIndex: 'var(--layout-nav-zIndex)',
        width: isMini ? 88 : 'var(--layout-nav-vertical-width)',
        transition: theme.transitions.create(['width', 'padding'], {
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          duration: '200ms',
        }),
        bgcolor: 'background.paper',
        [theme.breakpoints.up(layoutQuery)]: {
          display: 'flex',
        },
        ...sx,
      }}
    >
      <NavContent
        data={data}
        groupedData={groupedData}
        favoriteItems={favoriteItems}
        slots={slots}
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        onChangeWorkspace={onChangeWorkspace}
        onCommandOpen={onCommandOpen}
        isMini={isMini}
        onToggleMini={onToggleMini}
      />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function NavMobile({
  sx,
  data,
  groupedData,
  favoriteItems,
  open,
  slots,
  onClose,
  workspaces,
  currentWorkspaceId,
  onChangeWorkspace,
  onCommandOpen,
}: NavContentProps & { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const theme = useTheme();
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl' || i18n.language?.startsWith('ar') || theme.direction === 'rtl';

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
      anchor={isRtl ? 'right' : 'left'}
      sx={{
        [`& .${drawerClasses.paper}`]: {
          pt: 2,
          px: 2,
          overflow: 'unset',
          width: 'var(--layout-nav-mobile-width)',
          bgcolor: 'background.paper',
          ...sx,
        },
      }}
    >
      <NavContent
        data={data}
        groupedData={groupedData}
        favoriteItems={favoriteItems}
        slots={slots}
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        onChangeWorkspace={onChangeWorkspace}
        onCommandOpen={onCommandOpen}
      />
    </Drawer>
  );
}

// ----------------------------------------------------------------------

function NavGroupAccordion({
  group,
  pathname,
  filterQuery,
}: {
  group: NavGroupData;
  pathname: string;
  filterQuery?: string;
}) {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl' || i18n.language?.startsWith('ar');

  const hasActiveItem = group.items.some(
    (item) => item.path === pathname || (item.path !== '/' && pathname.startsWith(`${item.path}/`))
  );

  const [open, setOpen] = useState(hasActiveItem || !group.collapsible);

  // Filter items if user is searching
  const visibleItems = useMemo(() => {
    if (!filterQuery || !filterQuery.trim()) return group.items;
    const q = filterQuery.toLowerCase().trim();
    return group.items.filter(
      (item) => item.title.toLowerCase().includes(q) || item.path.toLowerCase().includes(q)
    );
  }, [group.items, filterQuery]);

  const totalBadges = visibleItems.reduce((acc, curr) => acc + (curr.badgeCount || 0), 0);

  // Auto-expand group when active route changes or user is filtering
  useEffect(() => {
    if (hasActiveItem || (filterQuery && filterQuery.trim().length > 0 && visibleItems.length > 0)) {
      setOpen(true);
    }
  }, [hasActiveItem, filterQuery, visibleItems.length]);

  if (visibleItems.length === 0) return null;

  // Non-collapsible group (e.g. My Workspace)
  if (!group.collapsible) {
    return (
      <Box component="li" sx={{ listStyle: 'none', mb: 1 }}>
        <Box
          sx={{
            px: 1.5,
            pt: 0.5,
            pb: 0.75,
            typography: 'caption',
            fontWeight: 'fontWeightBold',
            color: 'text.disabled',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: '0.7rem',
          }}
        >
          {group.title}
        </Box>

        <Box
          component="ul"
          sx={{
            p: 0,
            m: 0,
            gap: 0.5,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {visibleItems.map((item, index) => {
            const isActived = item.path === pathname || (item.path !== '/' && pathname.startsWith(`${item.path}/`));
            return (
              <ListItem disableGutters disablePadding key={`${item.title}-${index}`}>
                <ListItemButton
                  disableGutters
                  component={RouterLink}
                  href={item.path}
                  sx={(theme) => ({
                    pl: isRtl ? 1.25 : 1.5,
                    py: 0.85,
                    gap: 1.5,
                    pr: isRtl ? 1.5 : 1.25,
                    borderRadius: 1,
                    typography: 'body2',
                    fontWeight: isActived ? 'fontWeightSemiBold' : 'fontWeightMedium',
                    color: isActived ? theme.vars.palette.primary.main : theme.vars.palette.text.secondary,
                    minHeight: 40,
                    transition: 'all 0.15s ease-in-out',
                    ...(isActived
                      ? {
                          bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
                          boxShadow: isRtl
                            ? `inset -3px 0 0 ${theme.vars.palette.primary.main}`
                            : `inset 3px 0 0 ${theme.vars.palette.primary.main}`,
                          '&:hover': {
                            bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.14),
                          },
                        }
                      : {
                          '&:hover': {
                            bgcolor: 'action.hover',
                            color: 'text.primary',
                          },
                        }),
                  })}
                >
                  <Box
                    component="span"
                    sx={{
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActived ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box component="span" sx={{ flexGrow: 1, fontSize: '0.85rem' }}>
                    {item.title}
                  </Box>
                  {item.badgeCount && item.badgeCount > 0 && (
                    <Box
                      sx={{
                        px: 0.85,
                        py: 0.2,
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: 'fontWeightBold',
                        bgcolor: 'error.main',
                        color: 'common.white',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                      }}
                    >
                      {item.badgeCount > 99 ? '99+' : item.badgeCount}
                    </Box>
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </Box>
      </Box>
    );
  }

  // Collapsible Groups
  return (
    <Box component="li" sx={{ listStyle: 'none', mb: 1 }}>
      <ListItemButton
        onClick={() => setOpen((prev) => !prev)}
        sx={(theme) => ({
          pl: isRtl ? 1 : 1.25,
          py: 0.75,
          pr: isRtl ? 1.25 : 1,
          borderRadius: 1,
          color: hasActiveItem ? theme.vars.palette.primary.main : theme.vars.palette.text.primary,
          fontWeight: hasActiveItem ? 'fontWeightBold' : 'fontWeightMedium',
          bgcolor: hasActiveItem ? varAlpha(theme.vars.palette.primary.mainChannel, 0.05) : 'transparent',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        })}
      >
        {group.icon && (
          <Box
            component="span"
            sx={{
              width: 18,
              height: 18,
              ...(isRtl ? { ml: 1.25 } : { mr: 1.25 }),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: hasActiveItem ? 'primary.main' : 'text.secondary',
            }}
          >
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
          <Box
            sx={{
              ...(isRtl ? { ml: 1 } : { mr: 1 }),
              px: 0.75,
              py: 0.15,
              borderRadius: '8px',
              fontSize: '0.6875rem',
              fontWeight: 'bold',
              bgcolor: 'error.main',
              color: 'common.white',
            }}
          >
            {totalBadges}
          </Box>
        )}
        <ChevronDown
          size={15}
          style={{
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: open ? 'rotate(0deg)' : isRtl ? 'rotate(90deg)' : 'rotate(-90deg)',
            opacity: 0.6,
          }}
        />
      </ListItemButton>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box
          component="ul"
          sx={{
            pl: isRtl ? 0 : 1.25,
            pr: isRtl ? 1.25 : 0,
            mt: 0.25,
            gap: 0.25,
            display: 'flex',
            flexDirection: 'column',
            ...(isRtl
              ? {
                  borderRight: (theme) => `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.14)}`,
                  mr: 2,
                  ml: 0,
                }
              : {
                  borderLeft: (theme) => `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.14)}`,
                  ml: 2,
                  mr: 0,
                }),
          }}
        >
          {visibleItems.map((item, index) => {
            const isActived = item.path === pathname || (item.path !== '/' && pathname.startsWith(`${item.path}/`));
            return (
              <ListItem disableGutters disablePadding key={`${item.title}-${index}`}>
                <ListItemButton
                  disableGutters
                  component={RouterLink}
                  href={item.path}
                  sx={(theme) => ({
                    pl: 1.5,
                    py: 0.65,
                    gap: 1.25,
                    pr: 1.25,
                    borderRadius: 0.75,
                    typography: 'body2',
                    fontSize: '0.8125rem',
                    fontWeight: isActived ? 'fontWeightSemiBold' : 'fontWeightRegular',
                    color: isActived ? theme.vars.palette.primary.main : theme.vars.palette.text.secondary,
                    minHeight: 36,
                    transition: 'all 0.15s ease-in-out',
                    ...(isActived
                      ? {
                          bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
                          fontWeight: 'fontWeightSemiBold',
                          '&:hover': {
                            bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.14),
                          },
                        }
                      : {
                          '&:hover': {
                            bgcolor: 'action.hover',
                            color: 'text.primary',
                          },
                        }),
                  })}
                >
                  <Box
                    component="span"
                    sx={{
                      width: 16,
                      height: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: isActived ? 1 : 0.7,
                      color: isActived ? 'primary.main' : 'inherit',
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box component="span" sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </Box>
                  {item.badgeCount && item.badgeCount > 0 && (
                    <Box
                      sx={{
                        px: 0.75,
                        py: 0.15,
                        borderRadius: '8px',
                        fontSize: '0.6875rem',
                        fontWeight: 'bold',
                        bgcolor: 'error.main',
                        color: 'common.white',
                      }}
                    >
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

export function NavContent({
  data,
  groupedData,
  favoriteItems = [],
  slots,
  workspaces,
  currentWorkspaceId,
  onChangeWorkspace,
  onCommandOpen,
  isMini = false,
  onToggleMini,
  sx,
}: NavContentProps) {
  const pathname = usePathname();
  const { i18n } = useTranslation();
  const theme = useTheme();
  const isRtl = i18n.dir() === 'rtl' || i18n.language?.startsWith('ar') || theme.direction === 'rtl';
  const [filterQuery, setFilterQuery] = useState('');

  // -------------------------------------------------------------------------
  // MINI (Collapsed 88px) MODE
  // -------------------------------------------------------------------------
  if (isMini) {
    // Collect all unique flat items from groupedData or fallback data
    const allNavItems: NavItem[] = groupedData && groupedData.length > 0
      ? groupedData.flatMap((g) => g.items)
      : data;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: 1, ...sx }}>
        {/* Mini Header / Logo */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1.5, gap: 1 }}>
          <Tooltip
            title={isRtl ? 'توسيع القائمة الجانبية (Ctrl+B)' : 'Expand Sidebar (Ctrl+B)'}
            placement={isRtl ? 'left' : 'right'}
            arrow
          >
            <IconButton
              onClick={onToggleMini}
              size="small"
              sx={{
                p: 0.5,
                borderRadius: 1.25,
                color: 'primary.main',
                '&:hover': {
                  bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.12),
                },
              }}
            >
              <Logo />
            </IconButton>
          </Tooltip>
        </Box>

        {slots?.topArea}

        {/* Mini Workspace Selector */}
        {workspaces && workspaces.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <WorkspacesPopover
              data={workspaces}
              value={currentWorkspaceId}
              onChangeWorkspace={onChangeWorkspace}
              sx={{
                p: 0.5,
                minWidth: 44,
                width: 44,
                height: 44,
                borderRadius: 1.25,
                justifyContent: 'center',
                '& svg, & .MuiTypography-root, & span:not(:first-of-type)': { display: 'none' },
              }}
            />
          </Box>
        )}

        {/* Mini Quick Find / Command Palette Trigger */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
          <Tooltip
            title={isRtl ? 'بحث سريع (⌘K / Ctrl+K)' : 'Quick find (⌘K / Ctrl+K)'}
            placement={isRtl ? 'left' : 'right'}
            arrow
          >
            <IconButton
              onClick={onCommandOpen}
              size="small"
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1.25,
                bgcolor: 'action.hover',
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.12),
                  color: 'primary.main',
                },
              }}
            >
              <Search size={18} />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider sx={{ my: 0.5, borderStyle: 'dashed' }} />

        {/* Mini Navigation Items List */}
        <Scrollbar fillContent sx={{ flex: '1 1 auto' }}>
          <Box
            component="nav"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 1,
              gap: 0.75,
            }}
          >
            {groupedData && groupedData.length > 0 ? (
              groupedData.map((group, gIdx) => (
                <Box key={group.id} sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {gIdx > 0 && (
                    <Box
                      sx={{
                        width: 24,
                        my: 0.75,
                        borderTop: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
                      }}
                    />
                  )}
                  {group.items.map((item, index) => {
                    const isActived =
                      item.path === pathname || (item.path !== '/' && pathname.startsWith(`${item.path}/`));

                    return (
                      <Tooltip
                        key={`${item.title}-${index}`}
                        title={
                          <Box sx={{ p: 0.25 }}>
                            <Typography variant="subtitle2" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                              {item.title}
                            </Typography>
                            {item.badgeCount && item.badgeCount > 0 ? (
                              <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700 }}>
                                {item.badgeCount} pending
                              </Typography>
                            ) : null}
                          </Box>
                        }
                        placement={isRtl ? 'left' : 'right'}
                        arrow
                      >
                        <ListItemButton
                          component={RouterLink}
                          href={item.path}
                          sx={{
                            width: 44,
                            height: 44,
                            minHeight: 44,
                            p: 0,
                            my: 0.25,
                            borderRadius: 1.25,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isActived ? 'primary.main' : 'text.secondary',
                            bgcolor: isActived
                              ? varAlpha(theme.vars.palette.primary.mainChannel, 0.12)
                              : 'transparent',
                            boxShadow: isActived
                              ? isRtl
                                ? `inset -3px 0 0 ${theme.vars.palette.primary.main}`
                                : `inset 3px 0 0 ${theme.vars.palette.primary.main}`
                              : 'none',
                            '&:hover': {
                              bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
                              color: 'primary.main',
                            },
                          }}
                        >
                          <Box
                            sx={{
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 20,
                              height: 20,
                            }}
                          >
                            {item.icon}
                            {item.badgeCount && item.badgeCount > 0 && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: -4,
                                  right: isRtl ? 'auto' : -4,
                                  left: isRtl ? -4 : 'auto',
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: 'error.main',
                                  border: `2px solid ${theme.vars.palette.background.paper}`,
                                }}
                              />
                            )}
                          </Box>
                        </ListItemButton>
                      </Tooltip>
                    );
                  })}
                </Box>
              ))
            ) : (
              allNavItems.map((item, index) => {
                const isActived =
                  item.path === pathname || (item.path !== '/' && pathname.startsWith(`${item.path}/`));

                return (
                  <Tooltip
                    key={`${item.title}-${index}`}
                    title={
                      <Box sx={{ p: 0.25 }}>
                        <Typography variant="subtitle2" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                          {item.title}
                        </Typography>
                        {item.badgeCount && item.badgeCount > 0 ? (
                          <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700 }}>
                            {item.badgeCount} pending
                          </Typography>
                        ) : null}
                      </Box>
                    }
                    placement={isRtl ? 'left' : 'right'}
                    arrow
                  >
                    <ListItemButton
                      component={RouterLink}
                      href={item.path}
                      sx={{
                        width: 44,
                        height: 44,
                        minHeight: 44,
                        p: 0,
                        my: 0.25,
                        borderRadius: 1.25,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isActived ? 'primary.main' : 'text.secondary',
                        bgcolor: isActived
                          ? varAlpha(theme.vars.palette.primary.mainChannel, 0.12)
                          : 'transparent',
                        boxShadow: isActived
                          ? isRtl
                            ? `inset -3px 0 0 ${theme.vars.palette.primary.main}`
                            : `inset 3px 0 0 ${theme.vars.palette.primary.main}`
                          : 'none',
                        '&:hover': {
                          bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
                          color: 'primary.main',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 20,
                          height: 20,
                        }}
                      >
                        {item.icon}
                        {item.badgeCount && item.badgeCount > 0 && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: -4,
                              right: isRtl ? 'auto' : -4,
                              left: isRtl ? -4 : 'auto',
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: 'error.main',
                              border: `2px solid ${theme.vars.palette.background.paper}`,
                            }}
                          />
                        )}
                      </Box>
                    </ListItemButton>
                  </Tooltip>
                );
              })
            )}
          </Box>
        </Scrollbar>

        {/* Mini Footer Toggle Button */}
        {onToggleMini && (
          <Box sx={{ mt: 'auto', pt: 1, pb: 1, display: 'flex', justifyContent: 'center' }}>
            <Tooltip
              title={isRtl ? 'توسيع القائمة (Ctrl+B)' : 'Expand Sidebar (Ctrl+B)'}
              placement={isRtl ? 'left' : 'right'}
              arrow
            >
              <IconButton
                onClick={onToggleMini}
                size="small"
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                {isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {slots?.bottomArea}
      </Box>
    );
  }

  // -------------------------------------------------------------------------
  // FULL EXPANDED (300px) MODE
  // -------------------------------------------------------------------------
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Logo />
          <Typography
            variant="subtitle1"
            sx={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700,
              letterSpacing: '0.02em',
              color: 'text.primary',
              lineHeight: 1.1,
            }}
          >
            Altus Connect
          </Typography>
        </Box>

        {onToggleMini && (
          <Tooltip
            title={isRtl ? 'تصغير القائمة الجانبية (Ctrl+B)' : 'Minimize Sidebar (Ctrl+B)'}
            placement={isRtl ? 'left' : 'right'}
            arrow
          >
            <IconButton
              size="small"
              onClick={onToggleMini}
              sx={{
                color: 'text.secondary',
                borderRadius: 1,
                p: 0.6,
                '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
              }}
            >
              <PanelLeftClose size={18} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {slots?.topArea}

      <WorkspacesPopover
        data={workspaces}
        value={currentWorkspaceId}
        onChangeWorkspace={onChangeWorkspace}
        sx={{ my: 1.5 }}
      />

      {/* Ergonomic Fast Filter & Command Trigger */}
      <Box sx={{ px: 0.5, mb: 1.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 1.25,
            py: 0.6,
            borderRadius: 1.5,
            bgcolor: 'action.hover',
            border: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}`,
            transition: 'border-color 0.2s',
            '&:focus-within': {
              borderColor: 'primary.main',
              bgcolor: 'background.paper',
            },
          }}
        >
          <Search size={15} style={{ opacity: 0.5, flexShrink: 0, marginRight: 8 }} />
          <InputBase
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Quick find..."
            fullWidth
            sx={{
              fontSize: '0.8125rem',
              '& input': {
                p: 0,
                '&::placeholder': {
                  opacity: 0.5,
                  fontSize: '0.8125rem',
                },
              },
            }}
          />
          {filterQuery ? (
            <IconButton size="small" onClick={() => setFilterQuery('')} sx={{ p: 0.25 }}>
              <X size={13} />
            </IconButton>
          ) : onCommandOpen ? (
            <Box
              component="button"
              onClick={onCommandOpen}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 0.6,
                py: 0.15,
                borderRadius: 0.75,
                bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.16),
                color: 'text.secondary',
                fontSize: '0.65rem',
                fontWeight: 'fontWeightBold',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'monospace',
                flexShrink: 0,
                '&:hover': {
                  bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.24),
                },
              }}
              title="Open Command Palette (Ctrl+K)"
            >
              ⌘K
            </Box>
          ) : null}
        </Box>
      </Box>

      {/* Pinned Favorites / Quick Shortcuts if present and not filtering */}
      {!filterQuery && favoriteItems.length > 0 && (
        <Box sx={{ mb: 1.5, px: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, mb: 0.5, color: 'text.disabled' }}>
            <Star size={12} />
            <Typography variant="caption" sx={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Favorites
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {favoriteItems.map((fav) => {
              const isActived = fav.path === pathname;
              return (
                <ListItemButton
                  key={fav.path}
                  component={RouterLink}
                  href={fav.path}
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    typography: 'caption',
                    fontSize: '0.75rem',
                    fontWeight: isActived ? 'fontWeightBold' : 'fontWeightMedium',
                    bgcolor: isActived
                      ? varAlpha(theme.vars.palette.primary.mainChannel, 0.12)
                      : varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
                    color: isActived ? 'primary.main' : 'text.secondary',
                    '&:hover': {
                      bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.16),
                      color: 'primary.main',
                    },
                  }}
                >
                  {fav.title}
                </ListItemButton>
              );
            })}
          </Box>
        </Box>
      )}

      <Scrollbar fillContent>
        <Box
          component="nav"
          sx={[
            {
              display: 'flex',
              flex: '1 1 auto',
              flexDirection: 'column',
              pb: 2,
            },
            ...(Array.isArray(sx) ? sx : [sx]),
          ]}
        >
          <Box
            component="ul"
            sx={{
              p: 0,
              m: 0,
              gap: 0.5,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {groupedData && groupedData.length > 0 ? (
              groupedData.map((group) => (
                <NavGroupAccordion
                  key={group.id}
                  group={group}
                  pathname={pathname}
                  filterQuery={filterQuery}
                />
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
                          pt: index === 0 ? 0.5 : 2,
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
                          {
                            pl: 1.5,
                            py: 0.85,
                            gap: 1.5,
                            pr: 1.25,
                            borderRadius: 1,
                            typography: 'body2',
                            fontWeight: 'fontWeightMedium',
                            color: theme.vars.palette.text.secondary,
                            minHeight: 40,
                            ...(isActived && {
                              fontWeight: 'fontWeightSemiBold',
                              color: theme.vars.palette.primary.main,
                              bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
                              '&:hover': {
                                bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.16),
                              },
                            }),
                          },
                        ]}
                      >
                        <Box component="span" sx={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {item.icon}
                        </Box>

                        <Box component="span" sx={{ flexGrow: 1, fontSize: '0.85rem' }}>
                          {item.title}
                        </Box>

                        {item.badgeCount && item.badgeCount > 0 ? (
                          <Box
                            component="span"
                            sx={{
                              px: 0.85,
                              py: 0.2,
                              borderRadius: '10px',
                              fontSize: '0.7rem',
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
