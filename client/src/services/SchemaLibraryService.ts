import apiClient from './APIclient';
import { SchemaLibrary } from '../types/SchemaLibrary';

export const createSchemaLibrary = async (data: {
  name: string;
  description?: string;
  setupSql: string;
}): Promise<SchemaLibrary> => {
  try {
    const response = await apiClient.post('/schema-libraries', data);
    return response.data.data as SchemaLibrary;
  } catch (error) {
    console.error("Error creating schema library:", error);
    throw error;
  }
};

export const getSchemaLibraryById = async (schemaLibraryId: number): Promise<SchemaLibrary> => {
  try {
    const response = await apiClient.get(`/schema-libraries/${schemaLibraryId}`);
    return response.data.data as SchemaLibrary;
  } catch (error) {
    console.error(`Error fetching schema library with ID ${schemaLibraryId}:`, error);
    throw error;
  }
};

export const getSchemaLibraries = async (): Promise<SchemaLibrary[]> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error("No token found, user is not authenticated.");
      throw new Error("Unauthorized: No token provided");
    }
    const response = await apiClient.get('/schema-libraries');
    return response.data.data as SchemaLibrary[];
  } catch (error) {
    console.error("Failed to fetch schema libraries:", error);
    return [];
  }
};

export const updateSchemaLibrary = async (schemaLibrary: SchemaLibrary): Promise<SchemaLibrary> => {
  try {
    const response = await apiClient.put(`/schema-libraries/${schemaLibrary.schemaLibraryId}`, schemaLibrary);
    return response.data.data as SchemaLibrary;
  } catch (error) {
    console.error("Error updating schema library:", error);
    throw error;
  }
};

export const deleteSchemaLibrary = async (schemaLibraryId: number): Promise<void> => {
  try {
    await apiClient.delete(`/schema-libraries/${schemaLibraryId}`);
  } catch (error) {
    console.error(`Error deleting schema library with ID ${schemaLibraryId}:`, error);
    throw error;
  }
};
