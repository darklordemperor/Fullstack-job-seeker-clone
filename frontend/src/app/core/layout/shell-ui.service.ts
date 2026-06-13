import { computed, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ShellUiService {
  readonly announcementVisible = signal(true);
  readonly searchCompact = signal(false);
  readonly navbarHeight = computed(() => this.announcementVisible() ? 84 : 56);
  readonly searchHeight = computed(() => this.searchCompact() ? 52 : 132);
  readonly detailTop = computed(() => this.navbarHeight() + this.searchHeight() + 16);

  dismissAnnouncement(): void {
    this.announcementVisible.set(false);
  }
}
