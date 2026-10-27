import { test, expect, api, session } from './fixtures';
import { randomUUID } from 'node:crypto';

for (const viewport of [{width:320,height:568},{width:768,height:1024},{width:844,height:390},{width:1440,height:900}]) {
  test(`notification inbox is private, persistent and linked at ${viewport.width}x${viewport.height}`,async ({browser,request},testInfo) => {
    const register=async (role:string) => {
      const email=`inbox-${randomUUID()}@example.com`,password='TestPassword123!';
      return {email,password,tokens:await api(request,'POST',`/auth/register/${role}`,{email,password,displayName:'Inbox QA'})};
    };
    const employer=await register('employer'),candidate=await register('job-seeker');
    const job=await api(request,'POST','/jobs',{title:'Notification workflow engineer',description:'A notification test opportunity.',location:'Bangkok',salaryMin:50000,salaryMax:80000,salaryCurrency:'THB'},employer.tokens);
    await api(request,'PATCH',`/jobs/${job.id}/status`,{status:'ACTIVE'},employer.tokens);
    await api(request,'PUT','/job-seeker/profile',{fullName:'Inbox Candidate',skills:[],workExperiences:[],educations:[],languages:[],licenses:[]},candidate.tokens);
    const application=await api(request,'POST','/applications',{jobId:job.id},candidate.tokens);
    const context=await browser.newContext({viewport,baseURL:'http://127.0.0.1:4207'}); const page=await context.newPage();
    const errors:string[]=[]; page.on('pageerror',error=>errors.push(error.message));
    try {
      await session(page,employer); await page.goto('/notifications');
      await expect(page.getByRole('heading',{name:'Notifications',exact:true})).toBeVisible();
      await expect(page.getByRole('heading',{name:'New application'})).toBeVisible();
      await expect(page.getByRole('link',{name:'Notifications, 1 unread',exact:true})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.getByRole('link',{name:/View details/}).click();
      await expect(page).toHaveURL(new RegExp(`/employer/applicants/${job.id}\\?applicationId=${application.id}`));
      await expect(page.getByRole('heading',{name:'Inbox Candidate',exact:true})).toBeVisible();
      await page.goto('/notifications'); await page.getByRole('button',{name:'Mark as read',exact:true}).click();
      await expect(page.getByRole('link',{name:'Notifications, 0 unread',exact:true})).toBeVisible();
      await page.reload(); await expect(page.getByRole('button',{name:'Mark as read',exact:true})).toHaveCount(0);
      await page.getByRole('button',{name:'Unread',exact:true}).click(); await expect(page.getByRole('heading',{name:'You’re all caught up'})).toBeVisible();
      await api(request,'PATCH',`/employer/applications/${application.id}/status`,{expectedStatus:'SUBMITTED',status:'REVIEWING',reason:'PRIVATE hiring note'},employer.tokens);
      const start=new Date(Date.now()+86400000),end=new Date(start.getTime()+3600000);
      const interview=await api(request,'POST',`/employer/applications/${application.id}/interviews`,{mode:'ONLINE',location:'https://example.com/meeting',timezone:'Asia/Bangkok',slots:[{startsAt:start.toISOString(),endsAt:end.toISOString()}]},employer.tokens);
      const candidateContext=await browser.newContext({viewport,baseURL:'http://127.0.0.1:4207'}); const candidatePage=await candidateContext.newPage();
      try {
        await session(candidatePage,candidate); await candidatePage.goto('/notifications');
        await expect(candidatePage.getByRole('heading',{name:'Interview invitation Unread',exact:true})).toBeVisible();
        await expect(candidatePage.getByRole('heading',{name:'Application update Unread',exact:true})).toBeVisible();
        await expect(candidatePage.locator('main')).not.toContainText('PRIVATE hiring note');
        await candidatePage.getByRole('link',{name:'View details : Application update'}).click();
        await expect(candidatePage.getByRole('region',{name:'Application from notification'})).toContainText('REVIEWING');
        await candidatePage.goto('/notifications'); await candidatePage.getByRole('link',{name:'View details : Interview invitation'}).click();
        await expect(candidatePage).toHaveURL(new RegExp(`interviewId=${interview.id}`));
        await expect(candidatePage.getByRole('button',{name:'Accept this time'})).toBeVisible();
        await candidatePage.getByRole('button',{name:'Accept this time'}).click(); await expect(candidatePage.locator('main')).toContainText('CONFIRMED');
        await candidatePage.goto('/notifications');
        await candidatePage.screenshot({path:testInfo.outputPath('notification-inbox.png'),fullPage:true});
        expect(await candidatePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      } finally { await candidateContext.close(); }
      await page.goto('/notifications'); await expect(page.getByRole('heading',{name:'Interview confirmed Unread',exact:true})).toBeVisible();
      await page.route('**/api/notifications?*',route=>route.fulfill({status:503,contentType:'application/json',body:'{"message":"Unavailable"}'}));
      await page.getByRole('button',{name:'Refresh',exact:true}).click(); await expect(page.getByRole('alert')).toContainText('Unable to load notifications');
      await page.unroute('**/api/notifications?*'); await page.getByRole('button',{name:'Try again'}).click(); await expect(page.getByRole('heading',{name:'Interview confirmed Unread',exact:true})).toBeVisible();
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}
