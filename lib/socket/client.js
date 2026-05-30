'use client';

import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = {};
    /** Zdarzenia już podpięte do this.socket → _emit */
    this.bridgedEvents = new Set();
  }

  _bridgeEvent(event) {
    if (!this.socket || this.bridgedEvents.has(event)) return;
    this.bridgedEvents.add(event);
    this.socket.on(event, (...args) => this._emit(event, ...args));
  }

  _bridgeExistingListeners() {
    for (const event of Object.keys(this.listeners)) {
      this._bridgeEvent(event);
    }
  }

  connect() {
    if (!this.socket) {
      this.socket = io({
        transports: ['websocket', 'polling'],
        rememberUpgrade: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 800,
        reconnectionDelayMax: 8000,
        timeout: 25000,
      });

      this.bridgedEvents = new Set();
      this.socket.on('connect', () => this._emit('connect'));
      this.socket.on('disconnect', (reason) => this._emit('disconnect', reason));
      this.socket.io.on('reconnect', () => this._emit('reconnect'));
      this.bridgedEvents.add('connect');
      this.bridgedEvents.add('disconnect');
      this.bridgedEvents.add('reconnect');

      this._bridgeExistingListeners();
    }

    if (!this.socket.connected) {
      this.socket.connect();
    }

    return this.socket;
  }

  /** Po minimalizacji / sleep — wymuś ponowne połączenie jeśli zerwane. */
  ensureConnected() {
    this.connect();
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    }
    return Boolean(this.socket?.connected);
  }

  isConnected() {
    return Boolean(this.socket?.connected);
  }

  waitForConnect(timeoutMs = 12000) {
    this.connect();
    if (this.isConnected()) return Promise.resolve(true);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off('connect', onConnect);
        reject(new Error('timeout'));
      }, timeoutMs);

      const onConnect = () => {
        clearTimeout(timer);
        this.off('connect', onConnect);
        resolve(true);
      };

      this.on('connect', onConnect);
      if (this.isConnected()) {
        clearTimeout(timer);
        this.off('connect', onConnect);
        resolve(true);
        return;
      }
      if (!this.socket.connected) {
        this.socket.connect();
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.bridgedEvents = new Set();
    }
  }

  emit(event, data) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket.connected) {
      this.socket.emit(event, data);
      return;
    }

    this.socket.once('connect', () => {
      this.socket.emit(event, data);
    });
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    if (this.socket) {
      this._bridgeEvent(event);
    }
    return this;
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  _emit(event, data) {
    this.listeners[event]?.forEach((cb) => cb(data));
  }
}

export const socketService = new SocketService();
