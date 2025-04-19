import apiClient from './APIclient';

export const getUserById = (userId: number) => {
  return apiClient.get(`/users/${userId}`);
};

export const deleteUser = (userId: number) => {
  return apiClient.delete(`/users/${userId}`);
};

