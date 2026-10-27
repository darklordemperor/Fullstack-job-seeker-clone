import { resumeFileError } from './resume.model';
describe('Résumé upload rules', () => {
  it('accepts a PDF up to the exact limit', () => {
    expect(resumeFileError({ name: 'CV.PDF', type: 'application/pdf', size: 5242880 })).toBeNull();
  });
  it('rejects empty, oversized and disguised files', () => {
    for (const size of [0, 5242881]) expect(resumeFileError({ name: 'cv.pdf', type: 'application/pdf', size })).toContain('5 MB');
    expect(resumeFileError({ name: 'cv.pdf.exe', type: 'application/pdf', size: 10 })).toContain('PDF file');
    expect(resumeFileError({ name: 'cv.pdf', type: 'text/html', size: 10 })).toContain('PDF file');
  });
});
