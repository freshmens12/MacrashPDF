export const SIZE_UNITS = ['MB', 'KB', 'B'];

// Exact conversions: 1 KB = 1024 bytes, 1 MB = 1024 KB.
export function formatSize(bytes, unit) {
  switch (unit) {
    case 'KB':
      return `${(bytes / 1024).toFixed(1)} KB`;
    case 'B':
      return `${bytes.toLocaleString('en-US')} bytes`;
    case 'MB':
    default:
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

export function percentSaved(originalSize, compressedSize) {
  if (!originalSize) return 0;
  return Math.round((1 - compressedSize / originalSize) * 100);
}
