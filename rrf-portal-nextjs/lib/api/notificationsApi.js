import { api } from './apiConfig';

/**
 * Get paginated notifications for current user
 */
export const getNotifications = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.type) query.set('type', params.type);
  if (params.isRead !== undefined) query.set('isRead', params.isRead);
  if (params.entityType) query.set('entityType', params.entityType);

  const queryString = query.toString();
  const endpoint = `/notifications${queryString ? `?${queryString}` : ''}`;
  return api.get(endpoint);
};

/**
 * Get unread notification count for bell badge
 */
export const getUnreadCount = async () => {
  return api.get('/notifications/unread-count');
};

/**
 * Mark a single notification as read
 */
export const markAsRead = async (id) => {
  return api.patch(`/notifications/${id}/read`, {});
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async () => {
  return api.patch('/notifications/read-all', {});
};

/**
 * Delete (archive) a notification
 */
export const deleteNotification = async (id) => {
  return api.delete(`/notifications/${id}`);
};
