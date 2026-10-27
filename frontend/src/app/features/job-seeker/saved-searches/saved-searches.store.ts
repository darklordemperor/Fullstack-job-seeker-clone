import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { SAVED_SEARCH_REPOSITORY } from '../../../core/di/repository.tokens';
import { SavedSearch, SavedSearchInput } from '../../../domain/saved-search.model';
import { savedSearchError } from '../../../domain/saved-search.rules';
import { Job } from '../../../domain/job.model';

export const SavedSearchesStore=signalStore(
  withState({items:[] as SavedSearch[],loading:false,error:'',busy:'',actionError:'',notice:'',
    selected:null as SavedSearch|null,jobs:[] as Job[],resultsLoading:false,resultsError:'',page:0,totalPages:1,total:0}),
  withMethods((store,repo=inject(SAVED_SEARCH_REPOSITORY))=>{
    let version=0,resultVersion=0,destroyed=false;
    const message=(error:unknown)=>error instanceof Error ? error.message : 'Unable to load saved searches.';
    async function load():Promise<void> {
      if(store.busy()) return;
      const current=++version; patchState(store,{loading:true,error:''});
      try { const items=await firstValueFrom(repo.list()); if(!destroyed && current===version) patchState(store,{items}); }
      catch(error){if(!destroyed && current===version) patchState(store,{error:message(error)});}
      finally{if(!destroyed && current===version) patchState(store,{loading:false});}
    }
    async function change(key:string,operation:()=>Promise<void>):Promise<boolean> {
      if(store.busy() || store.loading()) return false;
      patchState(store,{busy:key,actionError:'',notice:''});
      try {await operation(); return !destroyed;}
      catch(error){if(!destroyed) patchState(store,{actionError:message(error)}); return false;}
      finally{if(!destroyed) patchState(store,{busy:''});}
    }
    return {
      load,
      async create(input:SavedSearchInput):Promise<boolean> {
        const error=savedSearchError(input); if(error){patchState(store,{actionError:error}); return false;}
        return change('create',async()=>{const item=await firstValueFrom(repo.create(input)); if(!destroyed) patchState(store,{items:[item,...store.items()],notice:'Search saved. Alerts are on for newly published matching jobs.'});});
      },
      async toggle(item:SavedSearch):Promise<void> {await change(item.id,async()=>{
        const updated=await firstValueFrom(repo.setEnabled(item.id,!item.enabled));
        if(!destroyed) patchState(store,{items:store.items().map(row=>row.id===item.id?updated:row),notice:updated.enabled?'Alerts resumed for future jobs.':'Alerts paused.'});
      });},
      async remove(item:SavedSearch):Promise<void> {await change(item.id,async()=>{
        await firstValueFrom(repo.remove(item.id));
        if(!destroyed){patchState(store,{items:store.items().filter(row=>row.id!==item.id),notice:'Saved search deleted.'});
          if(store.selected()?.id===item.id){++resultVersion;patchState(store,{selected:null,jobs:[],resultsLoading:false});}}
      });},
      async matches(item:SavedSearch,page=0):Promise<void> {
        const current=++resultVersion; patchState(store,{selected:item,page,resultsLoading:true,resultsError:'',jobs:[]});
        try {let result=await firstValueFrom(repo.matches(item.id,page));
          if(result.page>0 && !result.content.length) result=await firstValueFrom(repo.matches(item.id,Math.max(0,result.totalPages-1)));
          if(!destroyed && current===resultVersion) patchState(store,{jobs:result.content,page:result.page,totalPages:result.totalPages,total:result.totalElements});}
        catch(error){if(!destroyed && current===resultVersion)patchState(store,{resultsError:message(error)});}
        finally{if(!destroyed && current===resultVersion)patchState(store,{resultsLoading:false});}
      },
      dispose():void{destroyed=true;++version;++resultVersion;},
    };
  }),withHooks({onDestroy(store){store.dispose();}}),
);
