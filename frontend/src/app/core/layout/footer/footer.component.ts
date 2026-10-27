import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="mt-16 border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
      <div class="shell flex flex-col justify-between gap-3 sm:flex-row">
        <span>JobsDB Clone · Portfolio project</span>
        <span>Find your next opportunity. Build your next team.</span>
      </div>
    </footer>
  `,
})
export class FooterComponent {
}
