import apiClient from './APIclient';
import { Classroom } from '../types/Classroom'


export const createClassroom = async (classroomData: any): Promise<Classroom> => {
    try {
      const response = await apiClient.post('/classrooms', classroomData);
      return response.data.data as Classroom;
    } catch (error) {
      console.error("Error creating classroom:", error);
      throw error;
    }
};
  
export const getClassroomById = async (classroomId: number): Promise<Classroom> => {
    try {
      const response = await apiClient.get(`/classrooms/${classroomId}`);
      console.log("Classroom response decoded", response.data.data);
      return response.data.data as Classroom;
    } catch (error) {
      console.error(`Error fetching classroom with ID ${classroomId}:`, error);
      throw error;
    }
};
  

export const getClassrooms = async (): Promise<Classroom[]> => {
    try {

      const token = localStorage.getItem('token');
      if (!token) {
        console.error("No token found, user is not authenticated.");
        throw new Error("Unauthorized: No token provided");
      }

      const response = await apiClient.get("/classrooms/classrooms");
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch classrooms:", error);
      return [];
    }
};

export const joinClassroom = (code: string) => {
    return apiClient.post('/classrooms/join', { code });
};

export const assignAssignmentToClassroom = (data: { classroomId: number; assignmentId: number; due_date: string | null }) => {
    return apiClient.post('/classrooms/assign', data);
};

export const deleteClassroom = (classroomId: number) => {
    return apiClient.delete(`/classrooms/${classroomId}`);
};
