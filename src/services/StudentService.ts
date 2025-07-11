import apiClient from './APIclient';
import { Classroom } from '../types/Classroom';

export const getStudentEnrolledClassrooms = async (): Promise<Classroom[]> => {
    try {
        const response = await apiClient.get('/students/my-classrooms');
        const classrooms: Classroom[] = response.data.data;
        return classrooms;
    } catch (error) {
        console.error('Failed to fetch classrooms:', error);
        return [];
    }
};

export const createStudent = (studentData: any) => {
    return apiClient.post('/students', studentData);
};

export const getStudentProfile = () => {
    return apiClient.get('/students/profile');
};

export const getStudentById = (studentId: number) => {
    return apiClient.get(`/students/${studentId}`);
};