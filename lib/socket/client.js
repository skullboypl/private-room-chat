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
        reconnectionAttempts: 10,
      });

      this.socket.on('connect', () => this._emit('connect'));
      this.socket.on('disconnect', () => this._emit('disconnect'));
      this.socket.on('roomJoined', (d) => this._emit('roomJoined', d));
      this.socket.on('receiveMessage', (d) => this._emit('receiveMessage', d));
      this.socket.on('userJoined', (d) => this._emit('userJoined', d));
      this.socket.on('userLeft', (d) => this._emit('userLeft', d));
      this.socket.on('roomError', (d) => this._emit('roomError', d));
      this.socket.on('activeRoomsList', (d) => this._emit('activeRoomsList', d));
      this.socket.on('roomUsersList', (d) => this._emit('roomUsersList', d));
      this.socket.on('roomQuickEmojiUpdated', (d) => this._emit('roomQuickEmojiUpdated', d));
      this.socket.on('roomNickChanged', (d) => this._emit('roomNickChanged', d));
    }

    if (!this.socket.connected) {
      this.socket.connect();
    }

    return this.socket;
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
