import { SalaryRangePipe } from './salary-range.pipe';

describe('SalaryRangePipe', () => {
  it('formats a complete salary range with currency', () => {
    const pipe = new SalaryRangePipe();

    expect(pipe.transform({ min: 35000, max: 50000, currency: 'THB' })).toBe('THB 35,000 - 50,000');
  });
});
