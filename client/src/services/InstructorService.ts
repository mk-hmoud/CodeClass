import apiClient from './APIclient';

export const createInstructor = (instructorData: any) => {
  return apiClient.post('/instructors', instructorData);
};

export const getInstructorByUserId = (userId: number) => {
  return apiClient.get(`/instructors/user/${userId}`);
};

export const getInstructorById = (instructorId: number) => {
  return apiClient.get(`/instructors/${instructorId}`);
};
