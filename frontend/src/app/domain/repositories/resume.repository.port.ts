import { Observable } from 'rxjs';
import { ResumeVersion } from '../resume.model';
export interface ResumeRepositoryPort {
  list(): Observable<ResumeVersion[]>;
  upload(file: File): Observable<ResumeVersion>;
  select(id: string): Observable<void>;
  clear(): Observable<void>;
  remove(id: string): Observable<void>;
  download(id: string): Observable<Blob>;
  applicationDownload(id: string, employer: boolean): Observable<Blob>;
}
