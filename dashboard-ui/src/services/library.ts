import api from './api';
import { UploadResponse } from '@/types/Analytics';

/**
 * Upload library data from multiple JSON files
 * @param files - Array of File objects from file input
 * @returns Upload response with statistics and library ID
 */
export const uploadLibrary = async (
  files: File[],
): Promise<UploadResponse> => {
  // Create FormData with files
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  // Upload to backend
  const response = await api.post<UploadResponse>(
    '/library/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for large uploads
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      },
    },
  );

  return response.data;
};
