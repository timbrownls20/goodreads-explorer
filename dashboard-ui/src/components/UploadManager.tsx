import { useRef } from 'react';
import { useLibrary } from '@/hooks/useLibrary';
import './UploadManager.css';

interface UploadManagerProps {
  onUploadSuccess?: () => void;
}

// Extend HTMLInputElement to support webkitdirectory
declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

export const UploadManager = ({ onUploadSuccess }: UploadManagerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    isUploading,
    uploadProgress,
    uploadResult,
    uploadError,
    handleUpload,
    resetUpload,
  } = useLibrary();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Validate file types (must be JSON)
    const invalidFiles = fileArray.filter(
      (file) => !file.name.endsWith('.json'),
    );

    if (invalidFiles.length > 0) {
      alert(
        `Invalid file types detected. Please upload only JSON files.\nInvalid: ${invalidFiles.map((f) => f.name).join(', ')}`,
      );
      return;
    }

    await handleUpload(fileArray);

    if (onUploadSuccess) {
      onUploadSuccess();
    }
  };

  const handleButtonClick = () => {
    resetUpload();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  return (
    <div className="upload-manager">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        multiple
        webkitdirectory=""
        directory=""
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {!uploadResult && !isUploading && (
        <div className="upload-section">
          <button
            onClick={handleButtonClick}
            className="upload-button"
            disabled={isUploading}
          >
            Select Library Folder
          </button>
          <p className="upload-hint">
            Choose the folder containing your JSON library files
          </p>
        </div>
      )}

      {isUploading && (
        <div className="upload-progress">
          <p>Uploading library data...</p>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="progress-text">{uploadProgress}%</p>
        </div>
      )}

      {uploadResult && (
        <div className="upload-result success">
          <h3>✓ Upload Complete</h3>
          <p>{uploadResult.message}</p>
          <div className="upload-stats">
            <span>Files Processed: {uploadResult.stats.filesProcessed}</span>
            <span>Books Imported: {uploadResult.stats.booksImported}</span>
            <span>
              Duration: {(uploadResult.stats.durationMs / 1000).toFixed(2)}s
            </span>
          </div>
          {uploadResult.errors && uploadResult.errors.length > 0 && (
            <details className="upload-errors">
              <summary>
                {uploadResult.errors.length} errors encountered
              </summary>
              <ul>
                {uploadResult.errors.map((err, idx) => (
                  <li key={idx}>
                    <strong>{err.file}:</strong> {err.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <button onClick={handleButtonClick} className="upload-button">
            Upload New Library
          </button>
        </div>
      )}

      {uploadError && (
        <div className="upload-result error">
          <h3>✗ Upload Failed</h3>
          <p>{uploadError}</p>
          <button onClick={handleButtonClick} className="upload-button">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};
