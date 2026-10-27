import { Component, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RESUME_REPOSITORY } from '../../core/di/repository.tokens';
import { ResumeMetadata } from '../../domain/resume.model';

@Component({
  selector: 'app-resume-download', standalone: true,
  template: `
    <button type="button" class="min-h-11 max-w-full break-all rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-left text-sm font-semibold text-blue-800 disabled:opacity-50" [disabled]="busy()" (click)="download()">
      {{ busy() ? 'Downloading…' : 'Download PDF: ' + resume().fileName }}
    </button>
    @if (error()) { <p role="alert" class="mt-2 text-sm text-red-700">{{ error() }}</p> }
  `,
})
export class ResumeDownloadComponent {
  readonly resume = input.required<ResumeMetadata>();
  readonly applicationId = input<string>();
  readonly employer = input(false);
  private readonly repo = inject(RESUME_REPOSITORY);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected async download(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    const resume = this.resume(), application = this.applicationId();
    try {
      const blob = await firstValueFrom(application ? this.repo.applicationDownload(application, this.employer()) : this.repo.download(resume.id));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = resume.fileName;
      document.body.appendChild(link); link.click(); link.remove();
      // Retain briefly so the browser can begin reading the download before revocation.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { this.error.set('Unable to download this résumé. Please try again.'); }
    finally { this.busy.set(false); }
  }
}
