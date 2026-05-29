import { Pipe, PipeTransform } from '@angular/core';
import { SalaryRange } from '../../domain/job.model';

@Pipe({
  name: 'salaryRange',
  standalone: true,
})
export class SalaryRangePipe implements PipeTransform {
  transform(range: SalaryRange | null | undefined): string {
    if (!range) {
      return 'Salary undisclosed';
    }
    const currency = range.currency || 'THB';
    const min = range.min ?? null;
    const max = range.max ?? null;
    if (min !== null && max !== null) {
      return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    }
    if (min !== null) {
      return `${currency} ${min.toLocaleString()}+`;
    }
    if (max !== null) {
      return `Up to ${currency} ${max.toLocaleString()}`;
    }
    return 'Salary undisclosed';
  }
}
