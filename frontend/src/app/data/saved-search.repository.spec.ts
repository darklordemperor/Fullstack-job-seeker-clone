import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController,provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { SavedSearchRepository } from './saved-search.repository';
describe('Saved-search HTTP contract',()=>{
  let repo:SavedSearchRepository,http:HttpTestingController;
  const url='/api/job-seeker/saved-searches';
  beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});repo=TestBed.inject(SavedSearchRepository);http=TestBed.inject(HttpTestingController);});
  afterEach(()=>http.verify());
  it('maps only allowed fields and normalizes salary currency',async()=>{
    const promise=firstValueFrom(repo.create({name:' Java ',query:' Java ',location:' Bangkok ',salaryMin:0,salaryMax:null,currency:' thb ',...{userId:'never-send'}}));
    const request=http.expectOne(url);expect(request.request.body).toEqual({name:'Java',query:'Java',location:'Bangkok',salaryMin:0,salaryMax:null,currency:'THB'});
    request.flush({success:true,data:{id:'s'}});expect(await promise).toEqual({id:'s'});
    const second=firstValueFrom(repo.create({name:'Name',query:'Java',location:'',salaryMin:null,salaryMax:null,currency:'USD'}));
    const r=http.expectOne(url);expect(r.request.body.currency).toBe('');r.flush({data:{id:'b'}});await second;
  });
  it('preserves empty lists, scopes updates and paginates matches',async()=>{
    const list=firstValueFrom(repo.list());http.expectOne(url).flush({data:[]});expect(await list).toEqual([]);
    const toggle=firstValueFrom(repo.setEnabled('a/b',false));const change=http.expectOne(url+'/a%2Fb');expect(change.request.method).toBe('PATCH');expect(change.request.body).toEqual({enabled:false});change.flush({data:{enabled:false}});await toggle;
    const matches=firstValueFrom(repo.matches('id',2));http.expectOne(url+'/id/jobs?page=2').flush({data:{content:[],page:2}});await matches;
    const remove=firstValueFrom(repo.remove('id'));const deletion=http.expectOne(url+'/id');expect(deletion.request.method).toBe('DELETE');deletion.flush({data:null});await remove;
  });
  it.each([[409,'criteria already exist'],[404,'no longer available'],[503,'Please try again']])('propagates %s failures',async(status,message)=>{
    const promise=firstValueFrom(repo.list());const assertion=expect(promise).rejects.toThrow(String(message));http.expectOne(url).flush({}, {status:Number(status),statusText:'Failure'});await assertion;
  });
});
