import { nextApplicationStatuses } from './application-transitions';
describe('Application transition eligibility', () => {
  it('offers review/rejection for submitted applications and hiring only after review', () => {
    expect(nextApplicationStatuses('SUBMITTED')).toEqual(['REVIEWING','REJECTED']);
    expect(nextApplicationStatuses('REVIEWING')).toEqual(['HIRED','REJECTED']);
    expect(nextApplicationStatuses('HIRED')).toEqual([]); expect(nextApplicationStatuses('REJECTED')).toEqual([]);
  });
});
