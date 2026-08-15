import type { Breakpoint } from '@mui/material/styles';

import { merge } from 'es-toolkit';
import { useBoolean } from 'minimal-shared/hooks';
import { useTranslation } from 'react-i18next';
import { useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { NavMobile, NavDesktop } from './nav';
import { layoutClasses } from '../core/classes';
import { dashboardLayoutVars } from './css-vars';
import { navData } from '../nav-config-dashboard';
import { MainSection } from '../core/main-section';
import { Searchbar } from '../components/searchbar';
import { MenuButton } from '../components/menu-button';
import { HeaderSection } from '../core/header-section';
import { LayoutSection } from '../core/layout-section';
import { AccountPopover } from '../components/account-popover';
import { NotificationsPopover } from '../components/notifications-popover';
import { LanguagePopover } from '../components/language-popover';

import type { MainSectionProps } from '../core/main-section';
import type { HeaderSectionProps } from '../core/header-section';
import type { LayoutSectionProps } from '../core/layout-section';
import type { NavItem, NavGroupData } from '../nav-config-dashboard';
import type { WorkspacesPopoverProps } from '../components/workspaces-popover';
import type { NotificationsPopoverProps } from '../components/notifications-popover';
import type { AccountPopoverProps } from '../components/account-popover';

// ----------------------------------------------------------------------

type LayoutBaseProps = Pick<LayoutSectionProps, 'sx' | 'children' | 'cssVars'>;

export type DashboardLayoutProps = LayoutBaseProps & {
  layoutQuery?: Breakpoint;
  navItems?: NavItem[];
  groupedNavItems?: NavGroupData[];
  favoriteItems?: NavItem[];
  workspaces?: WorkspacesPopoverProps['data'];
  currentWorkspaceId?: string;
  onChangeWorkspace?: (id: string) => void;
  notifications?: NotificationsPopoverProps['data'];
  onNotificationClick?: NotificationsPopoverProps['onNotificationClick'];
  onMarkAllRead?: NotificationsPopoverProps['onMarkAllRead'];
  onViewAllNotifications?: NotificationsPopoverProps['onViewAll'];
  account?: AccountPopoverProps['account'];
  accountLinks?: AccountPopoverProps['data'];
  onLogout?: () => void;
  onCommandOpen?: () => void;
  slotProps?: {
    header?: HeaderSectionProps;
    main?: MainSectionProps;
  };
};

export function DashboardLayout({
  sx,
  cssVars,
  children,
  slotProps,
  navItems = navData,
  groupedNavItems,
  favoriteItems,
  workspaces = [],
  currentWorkspaceId,
  onChangeWorkspace,
  notifications = [],
  onNotificationClick,
  onMarkAllRead,
  onViewAllNotifications,
  account,
  accountLinks = [],
  onLogout,
  onCommandOpen,
  layoutQuery = 'lg',
}: DashboardLayoutProps) {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl' || i18n.language?.startsWith('ar') || theme.direction === 'rtl';

  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const [isNavMini, setIsNavMini] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('dashboard_nav_mini') === 'true';
    } catch {
      return false;
    }
  });

  const toggleNavMini = useCallback(() => {
    setIsNavMini((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('dashboard_nav_mini', String(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  }, []);

  // Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar minimization
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable) {
          return;
        }
        e.preventDefault();
        toggleNavMini();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleNavMini]);

  const renderHeader = () => {
    const headerSlotProps: HeaderSectionProps['slotProps'] = {
      container: {
        maxWidth: false,
      },
    };

    const headerSlots: HeaderSectionProps['slots'] = {
      topArea: (
        <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
          This is an info Alert.
        </Alert>
      ),
      leftArea: (
        <>
          {/** @slot Nav mobile */}
          <MenuButton
            onClick={onOpen}
            sx={{ mr: 1, ml: -1, [theme.breakpoints.up(layoutQuery)]: { display: 'none' } }}
          />
          {/** @slot Desktop Minimize/Expand Toggle */}
          <Tooltip
            title={
              isNavMini
                ? isRtl
                  ? 'توسيع القائمة الجانبية (Ctrl+B)'
                  : 'Expand Sidebar (Ctrl+B)'
                : isRtl
                ? 'تصغير القائمة الجانبية (Ctrl+B)'
                : 'Minimize Sidebar (Ctrl+B)'
            }
          >
            <IconButton
              onClick={toggleNavMini}
              size="small"
              sx={{
                display: 'none',
                [theme.breakpoints.up(layoutQuery)]: { display: 'inline-flex' },
                mr: isRtl ? 0 : 1,
                ml: isRtl ? 1 : -0.5,
                color: 'text.secondary',
                borderRadius: 1,
                p: 0.75,
                '&:hover': {
                  color: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              {isNavMini ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </IconButton>
          </Tooltip>
          <NavMobile
            data={navItems}
            groupedData={groupedNavItems}
            favoriteItems={favoriteItems}
            open={open}
            onClose={onClose}
            workspaces={workspaces}
            currentWorkspaceId={currentWorkspaceId}
            onChangeWorkspace={onChangeWorkspace}
            onCommandOpen={onCommandOpen}
          />
        </>
      ),
      rightArea: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
          {/** @slot Searchbar */}
          <Searchbar onCommandOpen={onCommandOpen} />

          {/** @slot Language popover */}
          <LanguagePopover />

          {/** @slot Notifications popover */}
          <NotificationsPopover
            data={notifications}
            onNotificationClick={onNotificationClick}
            onMarkAllRead={onMarkAllRead}
            onViewAll={onViewAllNotifications}
          />

          {/** @slot Account drawer */}
          <AccountPopover data={accountLinks} account={account} onLogout={onLogout} />
        </Box>
      ),
    };

    return (
      <HeaderSection
        disableElevation
        layoutQuery={layoutQuery}
        {...slotProps?.header}
        slots={{ ...headerSlots, ...slotProps?.header?.slots }}
        slotProps={merge(headerSlotProps, slotProps?.header?.slotProps ?? {})}
        sx={slotProps?.header?.sx}
      />
    );
  };

  const renderFooter = () => null;

  const renderMain = () => <MainSection {...slotProps?.main}>{children}</MainSection>;

  const resolvedNavWidth = isNavMini ? '88px' : '300px';

  return (
    <LayoutSection
      /** **************************************
       * @Header
       *************************************** */
      headerSection={renderHeader()}
      /** **************************************
       * @Sidebar
       *************************************** */
      sidebarSection={
        <NavDesktop
          data={navItems}
          groupedData={groupedNavItems}
          favoriteItems={favoriteItems}
          layoutQuery={layoutQuery}
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          onChangeWorkspace={onChangeWorkspace}
          onCommandOpen={onCommandOpen}
          isMini={isNavMini}
          onToggleMini={toggleNavMini}
        />
      }
      /** **************************************
       * @Footer
       *************************************** */
      footerSection={renderFooter()}
      /** **************************************
       * @Styles
       *************************************** */
      cssVars={{
        ...dashboardLayoutVars(theme),
        '--layout-nav-vertical-width': resolvedNavWidth,
        ...cssVars,
      }}
      sx={[
        {
          [`& .${layoutClasses.sidebarContainer}`]: {
            [theme.breakpoints.up(layoutQuery)]: {
              ...(isRtl
                ? {
                    paddingRight: resolvedNavWidth,
                    paddingLeft: 0,
                  }
                : {
                    paddingLeft: resolvedNavWidth,
                    paddingRight: 0,
                  }),
              transition: theme.transitions.create(['padding-left', 'padding-right'], {
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                duration: '200ms',
              }),
            },
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {renderMain()}
    </LayoutSection>
  );
}
