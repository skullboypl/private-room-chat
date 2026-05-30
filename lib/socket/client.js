'use client';

import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = {};
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

      this.socket.on('connect', () => this._emit('connect'));
      this.socket.on('disconnect', (reason) => this._emit('disconnect', reason));
      this.socket.io.on('reconnect', () => this._emit('reconnect'));
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

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
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
