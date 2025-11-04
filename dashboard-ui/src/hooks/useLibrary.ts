import { useState } from 'react';
import { uploadLibrary } from '@/services/library';
import { UploadResponse } from '@/types/Analytics';

interface UseLibraryReturn {
  isUploading: boolean;
  uploadProgress: number;
  uploadResult: UploadResponse | null;
  uploadError: string | null;
  handleUpload: (files: File[]) => Promise<void>;
  resetUpload: () => void;
}

/**
 * Custom hook for managing library upload state
 */
export const useLibrary = (): UseLibraryReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadResult(null);

    try {
      // Simulate progress updates (actual progress would come from axios interceptor)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const result = await uploadLibrary(files);

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadResult(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Upload failed. Please try again.';
      setUploadError(errorMessage);
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setUploadProgress(0);
    setUploadResult(null);
    setUploadError(null);
  };

  return {
    isUploading,
    uploadProgress,
    uploadResult,
    uploadError,
    handleUpload,
    resetUpload,
  };
};
