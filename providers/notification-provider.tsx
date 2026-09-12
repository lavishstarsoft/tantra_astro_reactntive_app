import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiUrl } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-tokens';

export type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
  data?: string;
};

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    const token = await getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/public/notifications/unread-count'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  };

  const refresh = async () => {
    const token = await getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/public/notifications'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        // Also update count from this list
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const markAsRead = async (id: string) => {
    const token = await getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/public/notifications/read'), {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    const token = await getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/public/notifications/read'), {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const clearAll = async () => {
    const token = await getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/public/notifications/clear'), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  const deleteNotification = async (id: string) => {
    const token = await getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/public/notifications'), {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        // Recalculate unread count if needed
        setUnreadCount(prev => {
          const wasRead = notifications.find(n => n.id === id)?.read;
          return wasRead ? prev : Math.max(0, prev - 1);
        });
      }
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  useEffect(() => {
    void fetchUnreadCount();
    void refresh();

    // Polling unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, refresh, markAsRead, markAllAsRead, clearAll, deleteNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
