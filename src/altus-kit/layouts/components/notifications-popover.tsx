import type { IconButtonProps } from '@mui/material/IconButton';

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';

// removed fToNow import

import { Iconify } from '@/altus-kit/components/iconify';
import { Scrollbar } from '@/altus-kit/components/scrollbar';

// ----------------------------------------------------------------------

type NotificationItemProps = {
  id: string;
  type: string;
  title: string;
  isUnRead: boolean;
  description: string;
  avatarUrl: string | null;
  postedAt: string | number | null;
};

export type NotificationsPopoverProps = IconButtonProps & {
  data?: NotificationItemProps[];
  /** Called when a notification item is clicked. Receives the notification object. */
  onNotificationClick?: (notification: NotificationItemProps) => void;
  /** Called when "Mark all as read" is clicked. */
  onMarkAllRead?: () => void;
  /** Called when the "View all" button is clicked. */
  onViewAll?: () => void;
};

export function NotificationsPopover({
  data = [],
  onNotificationClick,
  onMarkAllRead,
  onViewAll,
  sx,
  ...other
}: NotificationsPopoverProps) {
  const { t, i18n } = useTranslation(['nav', 'common', 'notifications']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const totalUnRead = data.filter((item) => item.isUnRead === true).length;

  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(null);

  const handleOpenPopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setOpenPopover(event.currentTarget);
  }, []);

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    onMarkAllRead?.();
  }, [onMarkAllRead]);

  const handleNotificationClick = useCallback(
    (notification: NotificationItemProps) => {
      onNotificationClick?.(notification);
      setOpenPopover(null);
    },
    [onNotificationClick]
  );

  const handleViewAll = useCallback(() => {
    onViewAll?.();
    setOpenPopover(null);
  }, [onViewAll]);

  return (
    <>
      <IconButton
        color={openPopover ? 'primary' : 'default'}
        onClick={handleOpenPopover}
        sx={sx}
        {...other}
      >
        <Badge badgeContent={totalUnRead} color="error">
          <Iconify width={24} icon="solar:bell-bing-bold-duotone" />
        </Badge>
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
              width: 360,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        <Box
          sx={{
            py: 2,
            pl: 2.5,
            pr: 1.5,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1">{t('nav:notifications', 'Notifications')}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('notifications:unread_messages', 'You have {{count}} unread messages', { count: totalUnRead })}
            </Typography>
          </Box>

          {totalUnRead > 0 && (
            <Tooltip title={t('notifications:mark_all_read', 'Mark all as read') as string}>
              <IconButton color="primary" onClick={handleMarkAllAsRead}>
                <Iconify icon="eva:done-all-fill" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Scrollbar fillContent sx={{ minHeight: 240, maxHeight: { xs: 360, sm: 'none' } }}>
          <List
            disablePadding
            subheader={
              <ListSubheader disableSticky sx={{ py: 1, px: 2.5, typography: 'overline' }}>
                {t('common:new', 'New')}
              </ListSubheader>
            }
          >
            {data.slice(0, 2).map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={handleNotificationClick}
                dateLocale={dateLocale}
              />
            ))}
          </List>

          <List
            disablePadding
            subheader={
              <ListSubheader disableSticky sx={{ py: 1, px: 2.5, typography: 'overline' }}>
                {t('notifications:before_that', 'Before that')}
              </ListSubheader>
            }
          >
            {data.slice(2, 5).map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={handleNotificationClick}
                dateLocale={dateLocale}
              />
            ))}
          </List>
        </Scrollbar>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box sx={{ p: 1 }}>
          <Button fullWidth disableRipple color="inherit" onClick={handleViewAll}>
            {t('common:view_all', 'View all')}
          </Button>
        </Box>
      </Popover>
    </>
  );
}

// ----------------------------------------------------------------------

function NotificationItem({
  notification,
  onClick,
  dateLocale,
}: {
  notification: NotificationItemProps;
  onClick?: (notification: NotificationItemProps) => void;
  dateLocale?: any;
}) {
  const { avatarUrl, title } = renderContent(notification);

  return (
    <ListItemButton
      onClick={() => onClick?.(notification)}
      sx={{
        py: 1.5,
        px: 2.5,
        mt: '1px',
        ...(notification.isUnRead && {
          bgcolor: 'action.selected',
        }),
      }}
    >
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: 'background.neutral' }}>{avatarUrl}</Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={title}
        secondary={
          <Typography
            variant="caption"
            sx={{
              mt: 0.5,
              gap: 0.5,
              display: 'flex',
              alignItems: 'center',
              color: 'text.disabled',
            }}
          >
            <Iconify width={14} icon="solar:clock-circle-outline" />
            {notification.postedAt ? formatDistanceToNow(new Date(notification.postedAt), { addSuffix: true, locale: dateLocale }) : ''}
          </Typography>
        }
      />
    </ListItemButton>
  );
}

// ----------------------------------------------------------------------

function renderContent(notification: NotificationItemProps) {
  const title = (
    <Typography variant="subtitle2">
      {notification.title}
      <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
        &nbsp; {notification.description}
      </Typography>
    </Typography>
  );

  if (notification.type === 'order-placed') {
    return {
      avatarUrl: (
        <img
          alt={notification.title}
          src="/altus-kit-assets/icons/notification/ic-notification-package.svg"
        />
      ),
      title,
    };
  }
  if (notification.type === 'order-shipped') {
    return {
      avatarUrl: (
        <img
          alt={notification.title}
          src="/altus-kit-assets/icons/notification/ic-notification-shipping.svg"
        />
      ),
      title,
    };
  }
  if (notification.type === 'mail') {
    return {
      avatarUrl: (
        <img alt={notification.title} src="/altus-kit-assets/icons/notification/ic-notification-mail.svg" />
      ),
      title,
    };
  }
  if (notification.type === 'chat-message') {
    return {
      avatarUrl: (
        <img alt={notification.title} src="/altus-kit-assets/icons/notification/ic-notification-chat.svg" />
      ),
      title,
    };
  }
  return {
    avatarUrl: notification.avatarUrl ? (
      <img alt={notification.title} src={notification.avatarUrl} />
    ) : null,
    title,
  };
}
