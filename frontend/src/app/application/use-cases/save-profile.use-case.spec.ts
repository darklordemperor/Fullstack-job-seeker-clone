import { firstValueFrom, of, throwError } from 'rxjs';
import { SaveProfileUseCase } from './save-profile.use-case';
import { JobSeekerRepositoryPort } from '../../domain/repositories/job-seeker.repository.port';
import { JobSeekerProfile, WorkExperience } from '../../domain/job-seeker-profile.model';

describe('SaveProfileUseCase', () => {
  const profile: JobSeekerProfile = { fullName: 'Alex', expectedSalary: { currency: 'THB' }, skills: [], workExperiences: [], educations: [], languages: [], licenses: [] };
  const updateProfile = vi.fn();
  const useCase = new SaveProfileUseCase({ updateProfile } as unknown as JobSeekerRepositoryPort);
  beforeEach(() => { updateProfile.mockReset(); updateProfile.mockImplementation(value => of(value)); });
  it('normalizes writable experience fields without mutating the draft or losing other profile data', async () => {
    const draft = { ...profile, workExperiences: [{ company: ' Team ', title: ' Engineer ', startDate: '', endDate: '' }] };
    const result = await firstValueFrom(useCase.execute(draft));
    expect(result.fullName).toBe('Alex');
    expect(result.workExperiences).toEqual([{ company: 'Team', title: 'Engineer', startDate: null, endDate: null }]);
    expect(draft.workExperiences[0].company).toBe(' Team ');
  });
  it.each<Partial<WorkExperience>>([
    { company: ' ' }, { title: '' }, { title: 'x'.repeat(181) }, { company: 'x'.repeat(181) },
    { startDate: '2024-01-02', endDate: '2024-01-01' }, { startDate: 'invalid' },
    { startDate: '2024-02-30' }, { endDate: '2024-13-01' },
  ])('rejects invalid work experience before calling the API: %j', async change => {
    await expect(firstValueFrom(useCase.execute({ ...profile, workExperiences: [{ company: 'Team', title: 'Engineer', ...change }] }))).rejects.toThrow('Experience 1:');
    expect(updateProfile).not.toHaveBeenCalled();
  });
  it('accepts ongoing roles, equal dates, optional dates and removal of all roles', async () => {
    for (const workExperiences of [[], [{ company: 'Team', title: 'Engineer', startDate: '2024-01-01' }],
      [{ company: 'Team', title: 'Engineer', startDate: '2024-01-01', endDate: '2024-01-01' }]]) {
      await firstValueFrom(useCase.execute({ ...profile, workExperiences }));
    }
    expect(updateProfile).toHaveBeenCalledTimes(3);
  });
  it('enforces the list limit and propagates API failures', async () => {
    await expect(firstValueFrom(useCase.execute({ ...profile, workExperiences: Array.from({ length: 101 }, () => ({ company: 'A', title: 'B' })) }))).rejects.toThrow('100');
    updateProfile.mockReturnValue(throwError(() => new Error('Offline')));
    await expect(firstValueFrom(useCase.execute(profile))).rejects.toThrow('Offline');
  });
});
