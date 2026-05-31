import { JobApplication } from '../domain/application.model';
import { AdminStats } from '../domain/admin.model';
import { Job } from '../domain/job.model';
import { JobSeekerProfile } from '../domain/job-seeker-profile.model';
import { User } from '../domain/user.model';

export const sampleJobs: Job[] = [
  {
    id: '91631142',
    employerId: 'emp-1',
    title: 'Brand & Growth Marketing Manager (Party Monster)',
    companyName: 'NUTRITION PROFESS PUBLIC COMPANY LIMITED',
    description: 'Drive brand and revenue growth for a functional supplement category across online, offline, and owned channels. Build the brand strategy, shape campaigns, and coordinate content, commerce, and performance marketing teams.',
    location: 'Huai Khwang, Bangkok',
    salaryMin: 45000,
    salaryMax: 60000,
    salaryCurrency: 'THB',
    industry: 'Marketing and Communications',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    applicants: 24,
  },
  {
    id: '92360137',
    employerId: 'emp-2',
    title: 'Senior Landscape Designer',
    companyName: 'SED Landscape Architects Limited',
    description: 'Lead design, project documentation, client management, and sustainable landscape planning for high-quality public spaces.',
    location: 'Bangkok',
    salaryMin: 42000,
    salaryMax: 65000,
    salaryCurrency: 'THB',
    industry: 'Design and Architecture',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
    applicants: 19,
  },
  {
    id: '92360138',
    employerId: 'emp-3',
    title: 'Technical Application Specialist (Cell Culture & Cellular Analysis Products)',
    companyName: 'Gibthai Co., Ltd.',
    description: 'Support laboratory and scientific application products with customer-facing technical guidance and product demonstrations.',
    location: 'Bangkok',
    salaryMin: 45000,
    salaryMax: 66000,
    salaryCurrency: 'THB',
    industry: 'Science and Technology',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    applicants: 31,
  },
  {
    id: '92360139',
    employerId: 'emp-4',
    title: 'Assistant Director of Sales',
    companyName: 'King Power Mahanakhon Co., Ltd.',
    description: 'Lead the sales team, develop revenue plans, and grow the attraction, hotel, and tourism business with strong commercial partnerships.',
    location: 'Bangkok',
    salaryMin: 70000,
    salaryMax: 100000,
    salaryCurrency: 'THB',
    industry: 'Sales',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 19 * 86400000).toISOString(),
    applicants: 42,
  },
  {
    id: '92360140',
    employerId: 'emp-5',
    title: 'QA Tester',
    companyName: 'EVERYMATRIX (THAILAND) Co., Ltd.',
    description: 'Own manual and automated test coverage for browser and mobile product releases in a flexible working environment.',
    location: 'Bangkok',
    salaryMin: 35000,
    salaryMax: 40000,
    salaryCurrency: 'THB',
    industry: 'Software',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    applicants: 19,
  },
  {
    id: '92360141',
    employerId: 'emp-6',
    title: 'Production Manager (Factory)',
    companyName: 'UNION INTA CO., LTD.',
    description: 'Manage production, reduce costs, improve efficiency, and ensure quality and safety for an established manufacturing operation.',
    location: 'Pluak Daeng, Rayong',
    salaryMin: 40000,
    salaryMax: 50000,
    salaryCurrency: 'THB',
    industry: 'Manufacturing',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 22 * 86400000).toISOString(),
    applicants: 15,
  },
];

export const sampleProfile: JobSeekerProfile = {
  fullName: 'Apirat Naresathien',
  phone: '089-555-5555',
  nationality: 'Thai',
  location: 'Bangkok',
  summary: 'Mobile and frontend developer with experience building responsive applications with Angular, React Native, Flutter, Android, Firebase, and REST APIs.',
  expectedSalary: { min: 55000, max: 85000, currency: 'THB' },
  skills: [
    { name: 'Angular', yearsOfExperience: 3, level: 'Advanced' },
    { name: 'React Native', yearsOfExperience: 3, level: 'Advanced' },
    { name: 'Spring Boot', yearsOfExperience: 1, level: 'Intermediate' },
    { name: 'Flutter', yearsOfExperience: 2, level: 'Intermediate' },
  ],
  workExperiences: [
    {
      company: 'Freelance',
      title: 'Mobile Application Developer',
      startDate: '2023-01-01',
      endDate: null,
      description: 'Built mobile apps with React Native, Flutter, Firebase, REST APIs, and cloud services. Delivered responsive interfaces and production-ready releases.',
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
  licenses: [
    { name: 'Flutter & Firebase E-Commerce App Development', issuer: 'Udemy', issuedYear: 2024 },
  ],
  resumeUrl: 'https://example.com/resume.pdf',
};

const applicantNames = ['Apirat Naresathien', 'Nicha S.', 'Kittipong P.', 'Ploy W.', 'Thanawat R.', 'Mali K.', 'Somsak T.', 'Araya C.'];

export const sampleApplications: JobApplication[] = Array.from({ length: 20 }, (_, index) => {
  const job = sampleJobs[index % sampleJobs.length];
  const applicantName = applicantNames[index % applicantNames.length];
  return {
    id: `app-${index + 1}`,
    jobId: job.id,
    jobSeekerId: index === 0 ? 'me' : `seeker-${index + 1}`,
    jobTitle: job.title,
    companyName: job.companyName,
    applicantName,
    applicantEmail: `${applicantName.toLowerCase().replace(/[^a-z]+/g, '.').replace(/\.$/, '')}@example.com`,
    status: index % 5 === 0 ? 'REVIEWING' : index % 7 === 0 ? 'HIRED' : 'SUBMITTED',
    appliedAt: new Date(Date.now() - index * 86400000).toISOString(),
  };
});

export const sampleUsers: User[] = [
  { id: 'admin', email: 'admin@jobsdb.local', role: 'ROLE_ADMIN', banned: false },
  { id: 'employer', email: 'hr@sansiri.local', role: 'ROLE_EMPLOYER', banned: false },
  { id: 'seeker', email: 'apirat55555@gmail.com', role: 'ROLE_JOB_SEEKER', banned: false },
];

export const sampleStats: AdminStats = {
  totalUsers: 3,
  totalJobSeekers: 1,
  totalEmployers: 1,
  totalJobs: sampleJobs.length,
  activeJobs: sampleJobs.length,
  totalApplications: sampleApplications.length,
  newUsersThisMonth: 3,
  newJobsThisMonth: sampleJobs.length,
};
