import { Component, input } from '@angular/core';
import { SalaryRange } from '../../../../../domain/job.model';
import { SalaryRangePipe } from '../../../../../shared/pipes/salary-range.pipe';

@Component({
  selector: 'app-expected-salary',
  standalone: true,
  imports: [SalaryRangePipe],
  template: `
    <section class="card-surface p-5">
      <h2 class="text-lg font-bold">Expected salary</h2>
      <p class="mt-3 text-sm font-semibold text-[#1C3F6E]">{{ salary() | salaryRange }}</p>
    </section>
  `,
})
export class ExpectedSalaryComponent {
  readonly salary = input<SalaryRange | null>(null);
}
