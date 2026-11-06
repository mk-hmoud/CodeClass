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

export interface GroupRosterBucket {
  groupNumber: number;
  studentIds: number[];
}

export interface ImportRostersResult {
  created: string[];
  assignments: { name: string; count: number }[];
}

// One-shot import: the server creates any missing group ("Group-N") and sets
// every group's roster in a single transaction.
export const importGroupRosters = async (
  classroomId: number,
  buckets: GroupRosterBucket[]
): Promise<ImportRostersResult> => {
  try {
    const response = await apiClient.post('/groups/import-rosters', { classroomId, buckets });
    return response.data.data as ImportRostersResult;
  } catch (error) {
    console.error("Error importing group rosters:", error);
    throw error;
  }
};
