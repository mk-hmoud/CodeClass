import apiClient from './APIclient';
import { Library } from '../types/Library';

export const createLibrary = async (libraryData: any): Promise<Library> => {
  try {
    const response = await apiClient.post('/libraries', libraryData);
    return response.data.data as Library;
  } catch (error) {
    console.error("Error creating library:", error);
    throw error;
  }
};

export const getLibraryById = async (libraryId: number): Promise<Library> => {
  try {
    const response = await apiClient.get(`/libraries/${libraryId}`);
    return response.data.data as Library;
  } catch (error) {
    console.error(`Error fetching library with ID ${libraryId}:`, error);
    throw error;
  }
};

export const getLibraries = async (): Promise<Library[]> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error("No token found, user is not authenticated.");
      throw new Error("Unauthorized: No token provided");
    }
    const response = await apiClient.get('/libraries');
    return response.data.data as Library[];
  } catch (error) {
    console.error("Failed to fetch libraries:", error);
    return [];
  }
};

export const updateLibrary = async (library: Library): Promise<Library> => {
  try {
    const response = await apiClient.put(`/libraries/${library.libraryId}`, library);
    return response.data.data as Library;
  } catch (error) {
    console.error("Error updating library:", error);
    throw error;
  }
};

export const deleteLibrary = async (libraryId: number): Promise<void> => {
  try {
    await apiClient.delete(`/libraries/${libraryId}`);
  } catch (error) {
    console.error(`Error deleting library with ID ${libraryId}:`, error);
    throw error;
  }
};
