import apiClient from './APIclient';
import { LabGroup } from '../types/Group';

export const createGroup = async (groupData: any): Promise<{ groupId: number }> => {
  try {
    const response = await apiClient.post('/groups', groupData);
    return response.data.data;
  } catch (error) {
    console.error("Error creating group:", error);
    throw error;
  }
};

export const getGroups = async (classroomId: number): Promise<LabGroup[]> => {
  try {
    const response = await apiClient.get('/groups', { params: { classroomId } });
    return response.data.data as LabGroup[];
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    return [];
  }
};

export const updateGroup = async (groupId: number, groupData: any): Promise<void> => {
  try {
    await apiClient.put(`/groups/${groupId}`, groupData);
  } catch (error) {
    console.error("Error updating group:", error);
    throw error;
  }
};

export const deleteGroup = async (groupId: number): Promise<void> => {
  try {
    await apiClient.delete(`/groups/${groupId}`);
  } catch (error) {
    console.error(`Error deleting group with ID ${groupId}:`, error);
    throw error;
  }
};

export const setGroupRoster = async (groupId: number, studentIds: number[]): Promise<void> => {
  try {
    await apiClient.put(`/groups/${groupId}/roster`, { studentIds });
  } catch (error) {
    console.error("Error setting group roster:", error);
    throw error;
  }
};
