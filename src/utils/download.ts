/**
 * Saves a blob as a file by clicking a temporary link. The blob URL is local to
 * this tab, so nothing leaves the device.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next tick so the browser has started the download first
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
