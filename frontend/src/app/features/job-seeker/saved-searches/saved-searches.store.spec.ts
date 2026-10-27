import { TestBed } from '@angular/core/testing';
import { of,Subject,throwError } from 'rxjs';
import { SAVED_SEARCH_REPOSITORY } from '../../../core/di/repository.tokens';
import { SavedSearchesStore } from './saved-searches.store';
import { SavedSearch } from '../../../domain/saved-search.model';
const item:SavedSearch={id:'s',name:'Java',query:'Java',location:'',salaryMin:null,salaryMax:null,currency:'',enabled:true,createdAt:'2026-10-24T00:00:00Z'};
const page={content:[],totalElements:0,totalPages:1,page:0};
describe('Saved-search workflow state',()=>{
  const repo={list:vi.fn(),create:vi.fn(),setEnabled:vi.fn(),remove:vi.fn(),matches:vi.fn()};
  const setup=()=>{TestBed.configureTestingModule({providers:[SavedSearchesStore,{provide:SAVED_SEARCH_REPOSITORY,useValue:repo}]});return TestBed.inject(SavedSearchesStore);};
  beforeEach(()=>{vi.resetAllMocks();repo.list.mockReturnValue(of([item]));repo.matches.mockReturnValue(of(page));});
  it('loads, creates, toggles, shows matches and deletes the selected search',async()=>{
    const store=setup();await store.load();expect(store.items()).toEqual([item]);
    repo.create.mockReturnValue(of({...item,id:'new'}));expect(await store.create(item)).toBe(true);expect(store.items()).toHaveLength(2);
    repo.setEnabled.mockReturnValue(of({...item,enabled:false}));await store.toggle(item);expect(store.items()[1].enabled).toBe(false);
    await store.matches(item);expect(store.selected()).toEqual(item);expect(store.resultsLoading()).toBe(false);
    repo.remove.mockReturnValue(of(undefined));await store.remove(item);expect(store.selected()).toBeNull();expect(store.items()).toHaveLength(1);
  });
  it('keeps data and reports mutation failures, invalid input and load failure',async()=>{
    const store=setup();await store.load();expect(await store.create({...item,name:''})).toBe(false);expect(repo.create).not.toHaveBeenCalled();
    repo.remove.mockReturnValue(throwError(()=>new Error('Offline')));await store.remove(item);expect(store.items()).toHaveLength(1);expect(store.actionError()).toBe('Offline');
    repo.list.mockReturnValue(throwError(()=>new Error('List failed')));await store.load();expect(store.error()).toBe('List failed');expect(store.loading()).toBe(false);
    repo.matches.mockReturnValue(throwError(()=>new Error('Matches failed')));await store.matches(item);expect(store.resultsError()).toBe('Matches failed');
  });
  it('ignores stale queries and responses after destruction',async()=>{
    const store=setup();const old=new Subject<SavedSearch[]>();repo.list.mockReturnValueOnce(old);const loading=store.load();
    expect(await store.create(item)).toBe(false);await store.load();old.next([]);old.complete();await loading;expect(store.items()).toHaveLength(1);
    const results=new Subject<typeof page>();repo.matches.mockReturnValueOnce(results);const pending=store.matches(item);await store.matches({...item,id:'other'});results.next({...page,totalElements:99});results.complete();await pending;expect(store.total()).toBe(0);
    const save=new Subject<SavedSearch>();repo.create.mockReturnValue(save);const creating=store.create(item);expect(await store.create(item)).toBe(false);await store.load();store.dispose();save.next(item);save.complete();expect(await creating).toBe(false);expect(store.items()).toHaveLength(1);
  });
  it('returns to the last available results page',async()=>{
    const store=setup();repo.matches.mockReturnValueOnce(of({...page,page:4,totalPages:2})).mockReturnValueOnce(of({...page,page:1,totalPages:2}));await store.matches(item,4);expect(repo.matches).toHaveBeenLastCalledWith(item.id,1);expect(store.page()).toBe(1);
  });
});
