/**
 * Push Notification Settings Component
 * 
 * Allows users to enable/disable browser push notifications.
 * Stores subscription in the database for backend notification delivery.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Bell, BellOff, Check, AlertCircle, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// Public VAPID key for push notifications
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export function PushNotificationSettings() {
  const { t } = useTranslation('settings');
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported = 
        'serviceWorker' in navigator && 
        'PushManager' in window &&
        'Notification' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        checkSubscription();
      }
    };
    
    checkSupport();
  }, []);

  // Check existing subscription
  const checkSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch {
      setIsSubscribed(false);
    }
  }, []);

  // Convert VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  };

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || !user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Request permission first
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        setError(t('push.permission_denied', { defaultValue: 'Notification permission denied. Please enable it in your browser settings.' }));
        return;
      }
      
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });
      
      // Send subscription to backend
      const { error: storeError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          subscription: subscription.toJSON(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });
      
      if (storeError) {
        throw storeError;
      }
      
      setIsSubscribed(true);
      toast({
        title: t('push.subscribed_title', { defaultValue: 'Notifications Enabled' }),
        description: t('push.subscribed_description', { defaultValue: 'You will now receive push notifications.' }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
      toast({
        title: t('push.error_title', { defaultValue: 'Error' }),
        description: t('push.error_description', { defaultValue: 'Failed to enable notifications.' }),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user, t, toast]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }
      
      // Remove from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);
      
      setIsSubscribed(false);
      toast({
        title: t('push.unsubscribed_title', { defaultValue: 'Notifications Disabled' }),
        description: t('push.unsubscribed_description', { defaultValue: 'You will no longer receive push notifications.' }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user, t, toast]);

  // Test notification
  const testNotification = useCallback(async () => {
    if (!isSubscribed) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(
        t('push.test_title', { defaultValue: 'Test Notification' }),
        {
          body: t('push.test_body', { defaultValue: 'This is a test notification from Prime Hotels Intranet.' }),
          icon: '/prime-logo-light.png',
          badge: '/prime-logo-light.png',
          tag: 'test',
        }
      );
    } catch {
      toast({
        title: t('push.test_error', { defaultValue: 'Test Failed' }),
        description: t('push.test_error_description', { defaultValue: 'Could not show test notification.' }),
        variant: 'destructive',
      });
    }
  }, [isSubscribed, t, toast]);

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            {t('push.not_supported_title', { defaultValue: 'Not Supported' })}
          </CardTitle>
          <CardDescription>
            {t('push.not_supported_description', { defaultValue: 'Push notifications are not supported in your browser.' })}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('push.title', { defaultValue: 'Push Notifications' })}
        </CardTitle>
        <CardDescription>
          {t('push.description', { defaultValue: 'Receive notifications even when the app is closed.' })}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isSubscribed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
            }`}>
              {isSubscribed ? <Check className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </div>
            <div>
              <p className="font-medium">
                {isSubscribed 
                  ? t('push.status_enabled', { defaultValue: 'Enabled' })
                  : t('push.status_disabled', { defaultValue: 'Disabled' })}
              </p>
              <p className="text-sm text-muted-foreground">
                {isSubscribed
                  ? t('push.status_enabled_desc', { defaultValue: 'You are receiving push notifications' })
                  : t('push.status_disabled_desc', { defaultValue: 'Enable to receive notifications' })}
              </p>
            </div>
          </div>
          
          <Switch
            checked={isSubscribed}
            onCheckedChange={isSubscribed ? unsubscribe : subscribe}
            disabled={isLoading || permission === 'denied'}
          />
        </div>
        
        {/* Permission Warning */}
        {permission === 'denied' && (
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              {t('push.browser_blocked', { defaultValue: 'Notifications are blocked in your browser settings. Please enable them to use this feature.' })}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Actions */}
        {isSubscribed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex gap-3"
          >
            <Button 
              variant="outline" 
              onClick={testNotification}
              className="flex-1"
            >
              <Bell className="h-4 w-4 mr-2" />
              {t('push.test_button', { defaultValue: 'Test Notification' })}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={checkSubscription}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </motion.div>
        )}
        
        {/* Info */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>{t('push.info_1', { defaultValue: 'Push notifications appear even when the app is closed.' })}</p>
          <p>{t('push.info_2', { defaultValue: 'You can disable them at any time from this settings page.' })}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default PushNotificationSettings;
