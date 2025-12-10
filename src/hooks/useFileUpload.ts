/**
 * Reusable File Upload Hook
 *
 * Provides drag-and-drop and file selection functionality with validation.
 * Eliminates code duplication between RadiographyAnalysis and ExcelAnalysis components.
 *
 * Features:
 * - Drag and drop support
 * - File type validation
 * - File size validation
 * - Visual drag state management
 * - Error handling with user-friendly messages
 *
 * Usage:
 *   const { dragActive, handleDrag, handleDrop, handleFileInput, error } =
 *     useFileUpload({
 *       onFileSelected: (file) => processFile(file),
 *       acceptedTypes: ['image/jpeg', 'image/png'],
 *       maxSizeMB: 10,
 *       fileTypeLabel: 'image'
 *     });
 */

import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface FileUploadOptions {
  /** Callback when valid file is selected */
  onFileSelected: (file: File) => void;

  /** Accepted MIME types (e.g., ['image/jpeg', 'image/png']) */
  acceptedTypes: readonly string[];

  /** Maximum file size in MB */
  maxSizeMB: number;

  /** Human-readable file type label for error messages (e.g., 'image', 'Excel') */
  fileTypeLabel: string;

  /** Optional callback for validation errors */
  onError?: (error: string) => void;
}

export interface FileUploadResult {
  /** Whether drag is currently active */
  dragActive: boolean;

  /** Current error message, if any */
  error: string | null;

  /** Drag event handler */
  handleDrag: (e: React.DragEvent<HTMLDivElement>) => void;

  /** Drop event handler */
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;

  /** File input change handler */
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;

  /** Clear current error */
  clearError: () => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useFileUpload(options: FileUploadOptions): FileUploadResult {
  const { onFileSelected, acceptedTypes, maxSizeMB, fileTypeLabel, onError } = options;

  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validate file against constraints
   */
  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        const acceptedExtensions = acceptedTypes
          .map((type) => type.split('/')[1])
          .join(', ');

        logger.warn('File type validation failed', {
          component: 'useFileUpload',
          fileType: file.type,
          acceptedTypes: Array.from(acceptedTypes),
        });

        return {
          valid: false,
          error: `Por favor seleccione un archivo ${fileTypeLabel} válido (${acceptedExtensions})`,
        };
      }

      // Check file size
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        logger.warn('File size validation failed', {
          component: 'useFileUpload',
          fileSize: file.size,
          maxSize: maxSizeBytes,
        });

        return {
          valid: false,
          error: `El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}MB`,
        };
      }

      return { valid: true };
    },
    [acceptedTypes, maxSizeMB, fileTypeLabel]
  );

  /**
   * Process and validate selected file
   */
  const processFile = useCallback(
    (file: File) => {
      const validation = validateFile(file);

      if (!validation.valid) {
        setError(validation.error || 'Archivo inválido');
        onError?.(validation.error || 'Archivo inválido');

        logger.error('File validation failed', {
          component: 'useFileUpload',
          fileName: file.name,
          error: validation.error,
        });

        return;
      }

      // Clear any previous errors
      setError(null);

      logger.info('File selected successfully', {
        component: 'useFileUpload',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      // Call parent callback with valid file
      onFileSelected(file);
    },
    [validateFile, onFileSelected, onError]
  );

  /**
   * Handle drag events (enter, over, leave)
   */
  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  /**
   * Handle file drop
   */
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];

        if (!file) {
          logger.warn('No file found in drop event', {
            component: 'useFileUpload',
          });
          return;
        }

        processFile(file);
      }
    },
    [processFile]
  );

  /**
   * Handle file input change
   */
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];

        if (!file) {
          logger.warn('No file found in input event', {
            component: 'useFileUpload',
          });
          return;
        }

        processFile(file);
      }
    },
    [processFile]
  );

  /**
   * Clear current error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    dragActive,
    error,
    handleDrag,
    handleDrop,
    handleFileInput,
    clearError,
  };
}
