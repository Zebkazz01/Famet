import client from './client';

export type NotificationType = 'INFO' | 'WARNING' | 'STOCK' | 'EXPIRY' | 'SALE' | 'SYSTEM';
export type NotificationFilter = 'all' | 'unread' | 'read' | 'archived' | 'deleted';
export type NotificationSort = 'newest' | 'oldest';
export type NotificationScope = 'mine' | 'all';

export interface ServerNotification {
  id: number;
  userId: number | null;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, unknown> | null;
  read: boolean;
  archived: boolean;
  deleted: boolean;
  createdAt: string;
  readAt: string | null;
  user?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
}

export interface ListParams {
  filter?: NotificationFilter;
  type?: NotificationType;
  q?: string;
  cursor?: string | null;
  limit?: number;
  from?: string;
  to?: string;
  sort?: NotificationSort;
  scope?: NotificationScope;
  userId?: number | string;
}

export interface ListResponse {
  items: ServerNotification[];
  nextCursor: string | null;
}

export async function list(params: ListParams = {}): Promise<ListResponse> {
  const res = await client.get('/notifications', { params });
  return res.data;
}

export async function unreadCount(): Promise<number> {
  const res = await client.get('/notifications/unread-count');
  return res.data.count;
}

export async function patch(
  id: number,
  data: { read?: boolean; archived?: boolean; deleted?: boolean },
): Promise<ServerNotification> {
  const res = await client.patch(`/notifications/${id}`, data);
  return res.data;
}

export async function markAllRead(): Promise<number> {
  const res = await client.patch('/notifications/mark-all-read');
  return res.data.updated;
}

export async function remove(id: number): Promise<void> {
  await client.delete(`/notifications/${id}`);
}

// Helpers semánticos
export const markRead = (id: number) => patch(id, { read: true });
export const markUnread = (id: number) => patch(id, { read: false });
export const archive = (id: number) => patch(id, { archived: true, read: true });
export const unarchive = (id: number) => patch(id, { archived: false });
export const trash = (id: number) => patch(id, { deleted: true, archived: true });
export const restore = (id: number) => patch(id, { deleted: false });
