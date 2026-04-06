import { io } from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const SOCKET_PATH = '/api/socket.io';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.isIntentionalDisconnect = false;
  }

  connect() {
    if (this.socket?.connected) return;
    
    this.isIntentionalDisconnect = false;

    this.socket = io(BACKEND_URL, {
      path: SOCKET_PATH,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.reconnectAttempts = 0;
      // Re-subscribe to any stored subscriptions
      this._resubscribeAll();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (!this.isIntentionalDisconnect && reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      console.warn(`Socket connection error (attempt ${this.reconnectAttempts}):`, error.message);
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached. Will retry in 30s.');
        setTimeout(() => {
          this.reconnectAttempts = 0;
          this.socket?.connect();
        }, 30000);
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_error', (error) => {
      console.warn('Socket reconnection error:', error.message);
    });
  }

  _resubscribeAll() {
    // Re-emit any stored subscriptions after reconnect
    if (this._subscribedAssets && this._subscribedAssets.length > 0) {
      this.emit('subscribe_prices', { assets: this._subscribedAssets });
    }
  }

  disconnect() {
    this.isIntentionalDisconnect = true;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this._subscribedAssets = [];
  }

  on(event, callback) {
    if (!this.socket) {
      this.connect();
    }
    
    this.socket.on(event, callback);
    
    // Store listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.socket) return;
    
    if (callback) {
      this.socket.off(event, callback);
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) listeners.splice(index, 1);
      }
    } else {
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      // Queue emission for when connected
      this.connect();
      this.socket?.once('connect', () => {
        this.socket?.emit(event, data);
      });
    }
  }

  subscribeToAssets(assets) {
    this._subscribedAssets = assets;
    this.emit('subscribe_prices', { assets });
  }

  unsubscribeFromAssets(assets) {
    this._subscribedAssets = this._subscribedAssets?.filter(a => !assets.includes(a)) || [];
    this.emit('unsubscribe_prices', { assets });
  }

  // Check if connected
  isConnected() {
    return this.socket?.connected || false;
  }
}

const socketService = new SocketService();
export default socketService;
