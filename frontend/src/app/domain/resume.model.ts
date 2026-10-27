export interface ResumeMetadata { id: string; fileName: string; sizeBytes: number; createdAt: string }
export interface ResumeVersion extends ResumeMetadata { current: boolean; attached: boolean }
export function resumeFileError(file: Pick<File, 'name' | 'type' | 'size'>): string | null {
  if (!file.size || file.size > 5 * 1024 * 1024) return 'Choose a PDF up to 5 MB.';
  if (!file.name.toLowerCase().endsWith('.pdf') || file.type !== 'application/pdf') return 'Choose a PDF file.';
  return null;
}
