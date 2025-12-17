interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  filename?: string;
  size?: number;
  type?: string;
  error?: string;
}

interface UploadOptions {
  onProgress?: (progress: number) => void;
  folder?: string; // Default folder in R2 (e.g., 'photos', 'thumbnails', 'icons')
}

/**
 * Upload file to Cloudflare R2 via API endpoint
 */
export async function uploadToR2(file: File, options: UploadOptions = {}): Promise<UploadResult> {
  try {
    // Validate file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/ogg'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `File type not allowed. Supported types: ${allowedTypes.join(', ')}`
      };
    }

    const maxSize = 50 * 1024 * 1024; // 50MB for videos
    if (file.size > maxSize) {
      return {
        success: false,
        error: `File too large. Max ${maxSize / (1024 * 1024)}MB`
      };
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);

    // Add folder if specified
    if (options.folder) {
      formData.append('folder', options.folder);
    }

    // Upload via API
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Upload failed'
      };
    }

    return {
      success: true,
      url: result.url,
      key: result.key,
      filename: result.filename,
      size: result.size,
      type: result.type,
    };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
}

/**
 * Upload multiple files to R2
 */
export async function uploadMultipleToR2(files: File[], options: UploadOptions = {}): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (const file of files) {
    const result = await uploadToR2(file, options);
    results.push(result);

    // Optional: Update progress callback
    if (options.onProgress) {
      const progress = (results.length / files.length) * 100;
      options.onProgress(progress);
    }
  }

  return results;
}

/**
 * Utility function to get file extension
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Utility function to check if file is image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Utility function to check if file is video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

