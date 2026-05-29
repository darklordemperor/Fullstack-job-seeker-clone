import { JobApplication } from '../domain/application.model';
import { AdminStats } from '../domain/admin.model';
import { Job } from '../domain/job.model';
import { JobSeekerProfile } from '../domain/job-seeker-profile.model';
import { User } from '../domain/user.model';

export const sampleJobs: Job[] = [
  {
    id: '92360136',
    employerId: 'emp-1',
    title: 'Frontend Developer (Outsource 6 months Contract)',
    companyName: 'Sansiri Public Company Limited',
    description: 'Improve web performance, Core Web Vitals, image optimization, and frontend rendering across a high-traffic job platform.',
    location: 'Wattana, Bangkok',
    salaryMin: 55000,
    salaryMax: 80000,
    salaryCurrency: 'THB',
    industry: 'Information Technology',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    applicants: 24,
  },
  {
    id: '92360137',
    employerId: 'emp-2',
    title: 'QA Tester',
    companyName: 'EVERYMATRIX (THAILAND) Co., Ltd.',
    description: 'Own manual and automated test coverage for browser and mobile product releases.',
    location: 'Bangkok',
    salaryMin: 35000,
    salaryMax: 40000,
    salaryCurrency: 'THB',
    industry: 'Software',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 13 * 86400000).toISOString(),
    applicants: 19,
  },
  {
    id: '92360138',
    employerId: 'emp-3',
    title: 'Technical Application Specialist',
    companyName: 'Gibthai Co., Ltd.',
    description: 'Support laboratory and scientific application products with customer-facing technical guidance.',
    location: 'Bangkok',
    salaryMin: 45000,
    salaryMax: 66000,
    salaryCurrency: 'THB',
    industry: 'Science and Technology',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    applicants: 31,
  },
];

export const sampleProfile: JobSeekerProfile = {
  fullName: 'อภิร์ตน์ นเรศเสถียร',
  phone: '089-555-5555',
  nationality: 'Thai',
  expectedSalary: { min: 55000, max: 85000, currency: 'THB' },
  skills: [
    { name: 'Angular', yearsOfExperience: 3, level: 'Advanced' },
    { name: 'React Native', yearsOfExperience: 3, level: 'Advanced' },
    { name: 'Spring Boot', yearsOfExperience: 1, level: 'Intermediate' },
  ],
  workExperiences: [
    {
      company: 'Freelance',
      title: 'Mobile Application Developer',
      startDate: '2023-01-01',
      endDate: null,
      description: 'Built mobile apps with React Native, Flutter, Firebase, and cloud services.',
    },
  ],
  educations: [
    {
      institution: 'Mahasarakham University',
      degree: 'Bachelor of Engineering',
      fieldOfStudy: 'Computer Engineering',
      graduationYear: 2022,
    },
  ],
  languages: [
    { language: 'Thai', proficiency: 'Native' },
    { language: 'English', proficiency: 'Working proficiency' },
  ],
  resumeUrl: 'https://example.com/resume.pdf',
};

export const sampleApplications: JobApplication[] = [
  {
    id: 'app-1',
    jobId: '92360136',
    jobSeekerId: 'me',
    jobTitle: 'Frontend Developer',
    companyName: 'Sansiri Public Company Limited',
    status: 'SUBMITTED',
    appliedAt: new Date().toISOString(),
  },
];

export const sampleUsers: User[] = [
  { id: 'admin', email: 'admin@jobsdb.local', role: 'ROLE_ADMIN', banned: false },
  { id: 'employer', email: 'hr@sansiri.local', role: 'ROLE_EMPLOYER', banned: false },
  { id: 'seeker', email: 'apirat55555@gmail.com', role: 'ROLE_JOB_SEEKER', banned: false },
];

export const sampleStats: AdminStats = {
  totalUsers: 3,
  totalJobSeekers: 1,
  totalEmployers: 1,
  totalJobs: 3,
  activeJobs: 3,
  totalApplications: 1,
  newUsersThisMonth: 3,
  newJobsThisMonth: 3,
};
