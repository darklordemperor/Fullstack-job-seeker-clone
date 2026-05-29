import { Component } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  template: `<section class="card-surface p-5"><ng-content /></section>`,
})
export class CardComponent {
}
