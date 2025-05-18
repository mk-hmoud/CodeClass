import apiClient from "./APIclient";

export interface ExportOptions {
  includeFields?: string[];
  format?: 'csv' | 'json' | 'xml' | 'zip' | 'excel' | 'pdf';
}

export const exportAssignment = async (
  assignmentId: number | string,
  options: ExportOptions = {}
): Promise<Blob> => {
  try {
    const { format = 'csv', includeFields = [] } = options;
    const endpoint = `/export/${assignmentId}/${format}`;
    const response = await apiClient.post(
      endpoint,
      { includeFields },
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    console.error(`Error exporting assignment ${assignmentId}:`, error);
    throw error;
  }
};

export const exportSubmissionsAsZip = async (assignmentId: number | string): Promise<Blob> => {
  try {
    const endpoint = `/export/${assignmentId}/zip`;
    const response = await apiClient.post(
      endpoint,
      {},
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    console.error(`Error exporting submissions as ZIP for assignment ${assignmentId}:`, error);
    throw error;
  }
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const exportAndDownloadAssignment = async (
  assignmentId: number | string,
  assignmentTitle: string,
  options: ExportOptions = {}
): Promise<void> => {
  try {
    const { format = 'csv' } = options;
    const blob = await exportAssignment(assignmentId, options);
    const safeTitle = assignmentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeTitle}_export.${format === 'excel' ? 'xlsx' : format}`;
    downloadBlob(blob, filename);
    return Promise.resolve();
  } catch (error) {
    console.error('Export and download failed:', error);
    throw error;
  }
};

export const exportAndDownloadSubmissionsAsZip = async (
  assignmentId: number | string,
  assignmentTitle: string
): Promise<void> => {
  try {
    const blob = await exportSubmissionsAsZip(assignmentId);
    const safeTitle = assignmentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeTitle}_submissions.zip`;
    downloadBlob(blob, filename);
    return Promise.resolve();
  } catch (error) {
    console.error('Export and download ZIP failed:', error);
    throw error;
  }
};