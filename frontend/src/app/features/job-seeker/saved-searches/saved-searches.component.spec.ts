import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of,Subject,throwError } from 'rxjs';
import { SAVED_SEARCH_REPOSITORY } from '../../../core/di/repository.tokens';
import { SavedSearchesComponent } from './saved-searches.component';
describe('Saved-search page',()=>{
  const repo={list:vi.fn(),create:vi.fn(),setEnabled:vi.fn(),remove:vi.fn(),matches:vi.fn()};
  beforeEach(()=>{vi.resetAllMocks();TestBed.configureTestingModule({providers:[provideRouter([]),{provide:SAVED_SEARCH_REPOSITORY,useValue:repo}]});});
  it('shows loading, error, retry and empty state',async()=>{
    const pending=new Subject();repo.list.mockReturnValue(pending);const fixture=TestBed.createComponent(SavedSearchesComponent);fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('Loading saved searches');
    pending.error(new Error('Offline'));await fixture.whenStable();fixture.detectChanges();expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Offline');
    repo.list.mockReturnValue(of([]));fixture.nativeElement.querySelector('[role="alert"] button').click();await fixture.whenStable();fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('Your next opportunity starts here');
  });
  it('preserves form values when saving fails and confirms deletion',async()=>{
    const item={id:'s',name:'Java',query:'Java',location:'',salaryMin:null,salaryMax:null,currency:'',enabled:true,createdAt:'2026-10-24T00:00:00Z'};
    repo.list.mockReturnValue(of([item]));repo.create.mockReturnValue(throwError(()=>new Error('Conflict')));repo.remove.mockReturnValue(of(undefined));
    const fixture=TestBed.createComponent(SavedSearchesComponent);fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();const root=fixture.nativeElement as HTMLElement;
    for(const [name,value] of [['name','My Java search'],['query','Java']]){const input=root.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;input.value=value;input.dispatchEvent(new Event('input'));}
    fixture.detectChanges();root.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await fixture.whenStable();fixture.detectChanges();expect(root.querySelector<HTMLInputElement>('input[name="name"]')!.value).toBe('My Java search');expect(root.textContent).toContain('Conflict');
    const button=(text:string)=>[...root.querySelectorAll('button')].find(value=>value.textContent?.trim().startsWith(text))!;
    button('Delete').click();fixture.detectChanges();button('Keep search').click();fixture.detectChanges();expect(root.textContent).not.toContain('Confirm delete');
    button('Delete').click();fixture.detectChanges();button('Confirm delete').click();await fixture.whenStable();fixture.detectChanges();expect(repo.remove).toHaveBeenCalledWith('s');expect(root.textContent).toContain('Saved search deleted');
  });
});
