import { test,expect,api,session } from './fixtures';
import { randomUUID } from 'node:crypto';

for(const viewport of [{width:320,height:568},{width:768,height:1024},{width:844,height:390},{width:1440,height:900}]) {
  test(`saved searches deliver private job alerts at ${viewport.width}x${viewport.height}`,async({browser,request},testInfo)=>{
    const register=async(role:string)=>{const email=`search-${randomUUID()}@example.com`,password='TestPassword123!';return {email,password,tokens:await api(request,'POST',`/auth/register/${role}`,{email,password,displayName:'Search QA'})};};
    const candidate=await register('job-seeker'),employer=await register('employer');
    const keyword=`search-${randomUUID().slice(0,8)}`;
    const context=await browser.newContext({viewport,baseURL:'http://127.0.0.1:4207'});const page=await context.newPage();
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    const publish=async()=>{const job=await api(request,'POST','/jobs',{title:`${keyword} Engineer`,description:'A matching product engineering role.',location:'Bangkok',salaryMin:50000,salaryMax:80000,salaryCurrency:'THB'},employer.tokens);await api(request,'PATCH',`/jobs/${job.id}/status`,{status:'ACTIVE'},employer.tokens);return job;};
    try {
      await session(page,candidate);await page.goto(`/jobs?q=${keyword}&location=Bangkok`);
      await page.getByRole('link',{name:'Save this search & create alerts'}).click();
      await expect(page.getByRole('heading',{name:'Saved searches & alerts'})).toBeVisible();
      await expect(page.getByLabel('Keyword',{exact:true})).toHaveValue(keyword);
      await expect(page.getByLabel('Location',{exact:true})).toHaveValue('Bangkok');
      await page.getByLabel('Search name',{exact:true}).fill('Bangkok product roles');
      await page.getByLabel('Minimum salary',{exact:true}).fill('80000');await page.getByLabel('Maximum salary',{exact:true}).fill('70000');
      await page.getByRole('button',{name:'Save search & enable alerts',exact:true}).click();
      await expect(page.getByRole('alert')).toContainText('Minimum salary cannot exceed');
      await page.getByLabel('Maximum salary',{exact:true}).fill('100000');
      await page.route('**/api/job-seeker/saved-searches',async route=>route.request().method()==='POST'?route.fulfill({status:503,contentType:'application/json',body:'{"message":"Unavailable"}'}):route.continue());
      await page.getByRole('button',{name:'Save search & enable alerts',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Please try again');
      await expect(page.getByLabel('Search name',{exact:true})).toHaveValue('Bangkok product roles');await page.unroute('**/api/job-seeker/saved-searches');
      await page.getByRole('button',{name:'Save search & enable alerts',exact:true}).click();
      await expect(page.getByRole('heading',{name:'Bangkok product roles',exact:true})).toBeVisible();
      // A second overlapping search must not generate a second notification for the same job.
      await api(request,'POST','/job-seeker/saved-searches',{name:'Overlapping keywords',query:keyword},candidate.tokens);
      const job=await publish();
      await page.getByRole('button',{name:'View matches : Bangkok product roles'}).click();
      await expect(page.getByRole('region',{name:'Matching jobs'}).getByRole('link',{name:job.title})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await expect(page.getByRole('button',{name:'Error Unavailable',exact:true})).toHaveCount(0);
      await page.evaluate(()=>window.scrollTo(0,0));
      await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);
      await page.screenshot({path:testInfo.outputPath('saved-searches.png'),fullPage:true});
      await page.getByRole('link',{name:'Open notifications',exact:true}).click();
      await expect(page.getByRole('link',{name:'Notifications, 1 unread',exact:true})).toBeVisible();
      await page.getByRole('link',{name:'View details : New matching job'}).click();await expect(page).toHaveURL(new RegExp(`/jobs/${job.id}$`));
      await expect(page.getByRole('heading',{name:job.title,exact:true})).toBeVisible();
      await page.goto('/job-seeker/saved-searches');
      await page.getByRole('button',{name:'Pause alerts : Bangkok product roles'}).click();await expect(page.getByRole('button',{name:'Resume alerts : Bangkok product roles'})).toBeVisible();
      await page.getByRole('button',{name:'Delete : Overlapping keywords',exact:true}).click();await page.getByRole('button',{name:'Confirm delete',exact:true}).click();
      await expect(page.getByRole('heading',{name:'Overlapping keywords'})).toHaveCount(0);
      const paused=await publish();await page.reload();await expect(page.getByRole('button',{name:'Resume alerts : Bangkok product roles'})).toBeVisible();
      await page.getByRole('button',{name:'Resume alerts : Bangkok product roles'}).click();await expect(page.getByRole('button',{name:'Pause alerts : Bangkok product roles'})).toBeVisible();
      await api(request,'PATCH',`/jobs/${paused.id}/status`,{status:'ACTIVE'},employer.tokens);
      expect((await api(request,'GET','/notifications/unread-count',undefined,candidate.tokens)).unreadCount).toBe(1);
      await publish();expect((await api(request,'GET','/notifications/unread-count',undefined,candidate.tokens)).unreadCount).toBe(2);
      await page.getByRole('button',{name:'Delete : Bangkok product roles',exact:true}).click();await page.getByRole('button',{name:'Confirm delete',exact:true}).click();
      await expect(page.getByRole('heading',{name:'Your next opportunity starts here'})).toBeVisible();
      expect(errors).toEqual([]);
    } finally {await context.close();}
  });
}
