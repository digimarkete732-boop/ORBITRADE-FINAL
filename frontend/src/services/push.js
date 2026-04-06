// Push Notification Service
import api from './api';

class PushNotificationService {
  constructor() {
    this.swRegistration = null;
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  }

  // Initialize service worker and push notifications
  async init() {
    if (!this.isSupported) {
      console.warn('Push notifications not supported in this browser');
      return false;
    }

    try {
      // Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', this.swRegistration);
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported) return 'unsupported';

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  // Check current permission status
  getPermissionStatus() {
    if (!this.isSupported) return 'unsupported';
    return Notification.permission;
  }

  // Subscribe to push notifications
  async subscribe() {
    if (!this.isSupported || !this.swRegistration) {
      await this.init();
    }

    if (!this.swRegistration) {
      throw new Error('Service Worker not registered');
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    try {
      // Check for existing subscription
      let subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription (VAPID key would be needed for production)
        // For now, we'll use a demo subscription without VAPID
        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          // In production, you'd use a VAPID public key here
          // applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      // Send subscription to backend
      await api.post('/api/notifications/subscribe', {
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent
      });

      console.log('Push subscription successful');
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    if (!this.swRegistration) return;

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await api.delete('/api/notifications/unsubscribe');
        console.log('Push unsubscription successful');
      }
    } catch (error) {
      console.error('Push unsubscription failed:', error);
    }
  }

  // Show local notification (without push)
  async showLocalNotification(title, options = {}) {
    if (!this.isSupported) return;

    const permission = this.getPermissionStatus();
    if (permission !== 'granted') {
      const newPermission = await this.requestPermission();
      if (newPermission !== 'granted') return;
    }

    if (this.swRegistration) {
      return this.swRegistration.showNotification(title, {
        icon: '/icon-192x192.png',
        badge: '/favicon-32x32.png',
        vibrate: [200, 100, 200],
        ...options
      });
    }
  }

  // Check if push is supported
  isPushSupported() {
    return this.isSupported;
  }
}

// Helper function to convert VAPID key (for production use)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const pushService = new PushNotificationService();
export default pushService;
