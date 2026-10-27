import { defer, Observable } from 'rxjs';
import { JobSeekerProfile } from '../../domain/job-seeker-profile.model';
import { JobSeekerRepositoryPort } from '../../domain/repositories/job-seeker.repository.port';
import { workExperienceError } from '../../domain/work-experience.rules';

export class SaveProfileUseCase {
  constructor(private readonly repository: JobSeekerRepositoryPort) {}
  execute(profile: JobSeekerProfile): Observable<JobSeekerProfile> {
    return defer(() => {
      const error = workExperienceError(profile.workExperiences);
      if (error) throw new Error(error);
      return this.repository.updateProfile({ ...profile, workExperiences: profile.workExperiences.map(item => ({
        ...item, company: item.company.trim(), title: item.title.trim(),
        startDate: item.startDate || null, endDate: item.endDate || null,
      })) });
    });
  }
}
