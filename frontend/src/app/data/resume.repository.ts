import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ResumeRepositoryPort } from '../domain/repositories/resume.repository.port';
import { ResumeVersion } from '../domain/resume.model';
import { ApiResponse } from './dto/api-response';

@Injectable({ providedIn: 'root' })
export class ResumeRepository implements ResumeRepositoryPort {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/job-seeker/resumes`;
  list() { return this.http.get<ApiResponse<ResumeVersion[]>>(this.url).pipe(map(r => r.data)); }
  upload(file: File) {
    const body = new FormData(); body.append('file', file);
    return this.http.post<ApiResponse<ResumeVersion>>(this.url, body).pipe(map(r => r.data));
  }
  select(id: string) { return this.http.put<ApiResponse<null>>(`${this.url}/${encodeURIComponent(id)}/current`, {}).pipe(map(() => undefined)); }
  clear() { return this.http.delete<ApiResponse<null>>(`${this.url}/current`).pipe(map(() => undefined)); }
  remove(id: string) { return this.http.delete<ApiResponse<null>>(`${this.url}/${encodeURIComponent(id)}`).pipe(map(() => undefined)); }
  download(id: string) { return this.http.get(`${this.url}/${encodeURIComponent(id)}/file`, { responseType: 'blob' }); }
  applicationDownload(id: string, employer: boolean) {
    return this.http.get(`${environment.apiUrl}/${employer ? 'employer/' : ''}applications/${encodeURIComponent(id)}/resume`, { responseType: 'blob' });
  }
}
