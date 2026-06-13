import { Injectable, signal } from '@angular/core';

export type AppLanguage = 'EN' | 'TH';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly storageKey = 'jobsdb-language';
  readonly current = signal<AppLanguage>(this.restore());

  set(language: AppLanguage): void {
    this.current.set(language);
    localStorage.setItem(this.storageKey, language);
  }

  text(en: string, th: string): string {
    return this.current() === 'TH' ? th : en;
  }

  private restore(): AppLanguage {
    return typeof localStorage !== 'undefined' && localStorage.getItem(this.storageKey) === 'TH' ? 'TH' : 'EN';
  }
}
