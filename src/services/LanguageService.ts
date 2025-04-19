import apiClient from "./APIclient";
import { Language } from "../types/Language";

export const getLanguages = async (): Promise<Language[]> => {
  try {
    const response = await apiClient.get("/language/languages");
    return response.data.data as Language[];
  } catch (error) {
    console.error("Error fetching languages", error);
    return [];
  }
};
