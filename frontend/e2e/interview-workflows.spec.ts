import { test, expect, session, api } from './fixtures';
import { readFile } from 'node:fs/promises';

test.use({ timezoneId: 'Asia/Bangkok' });
for (const [width,height] of [[320,568],[768,1024],[844,390],[1440,900]]) {
  test(`interview invitation to calendar and reschedule at ${width}x${height}`, async ({ page, browser, request, fixtures }, testInfo) => {
    test.setTimeout(120_000);
    // Clock-skew checks rotate refresh tokens; never share that session between viewport tests.
    const employer = { ...fixtures.employer, tokens: await api(request,'POST','/auth/login',{email:fixtures.employer.email,password:fixtures.employer.password}) };
    await page.setViewportSize({width,height}); await session(page,employer);
    const job=await api(request,'POST','/jobs',{title:`Interview Engineer ${width}`,description:'Build useful products',location:'Bangkok',salaryMin:100,salaryMax:200,salaryCurrency:'THB'},employer.tokens);
    await api(request,'PATCH',`/jobs/${job.id}/status`,{status:'ACTIVE'},employer.tokens);
    const application=await api(request,'POST','/applications',{jobId:job.id},fixtures.candidate.tokens);
    const candidateContext=await browser.newContext({viewport:{width,height},timezoneId:'Asia/Bangkok'});
    const candidate=await candidateContext.newPage(); await session(candidate,fixtures.candidate);
    const start=new Date(Date.now()+5*86400000+width*60000); start.setUTCSeconds(0,0);
    const local=(date:Date) => new Date(date.getTime()+7*3600000).toISOString().slice(0,16);
    try {
      await page.goto(`/employer/applicants/${job.id}`);
      await page.locator('main button').filter({hasText:fixtures.candidate.email}).click();
      await page.getByRole('link',{name:'Schedule interview',exact:true}).click();
      const editor=page.getByRole('dialog',{name:'Interview invitation'});
      await expect(editor).toBeVisible();
      await editor.getByLabel('HTTPS meeting link').fill('https://example.com/interview');
      await editor.getByLabel('Start time 1',{exact:true}).fill(local(start));
      await editor.getByLabel('End time 1',{exact:true}).fill(local(new Date(start.getTime()+3600000)));
      await editor.getByRole('button',{name:'Add another time'}).click();
      await editor.getByLabel('Start time 2',{exact:true}).fill(local(new Date(start.getTime()+7200000)));
      await editor.getByLabel('End time 2',{exact:true}).fill(local(new Date(start.getTime()+10800000)));
      expect(await editor.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
      await editor.evaluate(el=>el.scrollTop=0); await page.screenshot({path:testInfo.outputPath('proposal-editor.png')});
      await page.route(`**/api/employer/applications/${application.id}/interviews`,route=>route.fulfill({status:503,json:{success:false,message:'Temporarily unavailable',data:null}}));
      await editor.getByRole('button',{name:'Send invitation'}).click(); await expect(editor.getByRole('alert')).toContainText('Temporarily unavailable');
      await expect(editor.getByLabel('HTTPS meeting link')).toHaveValue('https://example.com/interview');
      await page.unroute(`**/api/employer/applications/${application.id}/interviews`);
      await editor.getByRole('button',{name:'Send invitation'}).click(); await expect(editor).not.toBeVisible();
      const employerCard=page.locator('article').filter({has:page.getByRole('heading',{name:job.title,exact:true})});
      await expect(employerCard.getByText('PROPOSED',{exact:true})).toBeVisible();
      await candidate.goto('/job-seeker/interviews');
      const card=candidate.locator('article').filter({has:candidate.getByRole('heading',{name:job.title,exact:true})});
      await expect(card.getByRole('button',{name:'Accept this time'})).toHaveCount(2);
      expect(await candidate.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await candidate.screenshot({path:testInfo.outputPath('candidate-invitation.png'),fullPage:true});
      await card.getByRole('button',{name:'Accept this time'}).first().click(); await expect(card.getByText('CONFIRMED',{exact:true})).toBeVisible();
      const downloadPromise=candidate.waitForEvent('download'); await card.getByRole('button',{name:'Download calendar'}).click();
      const download=await downloadPromise; expect(download.suggestedFilename()).toMatch(/^interview-.*\.ics$/);
      const content=await readFile((await download.path())!,'utf8'); expect(content).toContain('BEGIN:VCALENDAR\r\n'); expect(content).toContain('DTSTART:'+start.toISOString().replace(/[-:]/g,'').replace('.000',''));
      await page.getByRole('button',{name:'Refresh',exact:true}).click(); await expect(employerCard.getByText('CONFIRMED',{exact:true})).toBeVisible();
      // A fast client clock may expose outcome buttons, but cannot bypass server time validation.
      await page.clock.setFixedTime(new Date(start.getTime()+3600001));
      await page.getByRole('button',{name:'Refresh',exact:true}).click();
      await employerCard.getByRole('button',{name:'Mark completed',exact:true}).click();
      await page.getByRole('dialog',{name:'Confirm interview action'}).getByRole('button',{name:'Confirm',exact:true}).click();
      await expect(page.locator('main').getByRole('alert')).toContainText('after the scheduled interview ends');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await page.clock.setFixedTime(new Date());
      await page.getByRole('button',{name:'Refresh',exact:true}).click();
      await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
      await employerCard.getByRole('button',{name:'Reschedule',exact:true}).click();
      await editor.getByLabel('Start time 1',{exact:true}).fill(local(new Date(start.getTime()+86400000)));
      await editor.getByLabel('End time 1',{exact:true}).fill(local(new Date(start.getTime()+90000000)));
      await editor.getByRole('button',{name:'Remove option 2',exact:true}).click();
      await editor.getByRole('button',{name:'Send invitation'}).click(); await expect(editor).not.toBeVisible();
      await employerCard.getByRole('button',{name:'View history',exact:true}).click();
      const history=page.getByRole('dialog',{name:'Interview history'});
      await expect(history.getByText('RESCHEDULED',{exact:false})).toBeVisible();
      await expect(history.getByText('Version 0',{exact:false})).toBeVisible();
      expect(await history.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
      await expect(page.locator('app-toast button')).toHaveCount(0);
      await page.screenshot({path:testInfo.outputPath('interview-history.png')});
      await history.getByRole('button',{name:'Close history'}).click();
      await expect(employerCard.getByRole('button',{name:'View history',exact:true})).toBeFocused();
      // An old browser view cannot cancel the replacement invitation with its previous version.
      await card.getByRole('button',{name:'Cancel interview'}).click(); await candidate.getByRole('dialog',{name:'Confirm interview action'}).getByRole('button',{name:'Confirm',exact:true}).click();
      await expect(candidate.getByRole('alert')).toContainText('Interview changed');
      await candidate.getByRole('button',{name:'Refresh',exact:true}).click();
      await expect(card.getByText('PROPOSED',{exact:true})).toBeVisible(); await card.getByRole('button',{name:'Accept this time'}).click();
      await expect(card.getByText('CONFIRMED',{exact:true})).toBeVisible();
      await page.getByRole('button',{name:'Refresh',exact:true}).click(); await expect(employerCard.getByText('CONFIRMED',{exact:true})).toBeVisible();
      await employerCard.getByRole('button',{name:'Cancel interview'}).click(); await page.getByRole('dialog',{name:'Confirm interview action'}).getByRole('button',{name:'Confirm',exact:true}).click();
      await expect(employerCard).toHaveCount(0);
      await page.getByRole('button',{name:'All interviews',exact:true}).click(); await expect(employerCard.getByText('CANCELLED',{exact:true})).toBeVisible();
      await employerCard.getByRole('button',{name:'Schedule next round'}).click();
      await expect(editor.getByLabel('Start time 1',{exact:true})).toHaveValue('');
      await editor.getByLabel('Interview format').selectOption('IN_PERSON');
      await editor.getByLabel('Location and room').fill('Room 12, Bangkok office');
      await editor.getByLabel('Start time 1',{exact:true}).fill(local(start));
      await editor.getByLabel('End time 1',{exact:true}).fill(local(new Date(start.getTime()+3600000)));
      await editor.getByRole('button',{name:'Send invitation'}).click(); await expect(editor).not.toBeVisible();
      await expect(page.locator('article').filter({hasText:job.title}).getByText('Round 2',{exact:true})).toBeVisible();
      await candidate.getByRole('button',{name:'Refresh',exact:true}).click(); await expect(card.getByText('PROPOSED',{exact:true})).toBeVisible();
      await card.getByRole('button',{name:'Decline invitation'}).click(); await candidate.getByRole('dialog',{name:'Confirm interview action'}).getByRole('button',{name:'Confirm',exact:true}).click();
      await expect(card).toHaveCount(0); await candidate.getByRole('button',{name:'All interviews',exact:true}).click();
      await expect(candidate.locator('article').filter({hasText:job.title}).getByText('DECLINED',{exact:true})).toBeVisible();
    } finally { await candidateContext.close(); }
  });
}
