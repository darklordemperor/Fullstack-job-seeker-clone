import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { firstValueFrom, throwError } from 'rxjs';
import { errorInterceptor } from './error.interceptor';
import { ToastService } from '../../shared/ui/toast/toast.service';

describe('HTTP error presentation', () => {
  const toast={error:vi.fn()};
  beforeEach(()=>{ vi.resetAllMocks(); TestBed.configureTestingModule({providers:[{provide:ToastService,useValue:toast}]}); });
  it('preserves the original error, displays mutation failures and avoids duplicate query/demo notifications', async () => {
    const failure=new HttpErrorResponse({status:409,error:{message:'Version changed'}});
    for(const method of ['POST','PUT','GET']) {
      const response=TestBed.runInInjectionContext(()=>errorInterceptor(new HttpRequest(method,'/api/example',{}),()=>throwError(()=>failure)));
      await expect(firstValueFrom(response)).rejects.toBe(failure);
    }
    expect(toast.error).toHaveBeenCalledTimes(2); expect(toast.error).toHaveBeenCalledWith('Version changed');
    const demo=new HttpRequest('POST','/api/example',{}).clone({setHeaders:{Authorization:'Bearer demo-token-employer'}});
    await expect(firstValueFrom(TestBed.runInInjectionContext(()=>errorInterceptor(demo,()=>throwError(()=>failure))))).rejects.toBe(failure);
    expect(toast.error).toHaveBeenCalledTimes(2);
  });
  it('uses transport text when the server has no error body', async () => {
    const failure=new HttpErrorResponse({status:0});
    await expect(firstValueFrom(TestBed.runInInjectionContext(()=>errorInterceptor(new HttpRequest('POST','/api/example',{}),()=>throwError(()=>failure))))).rejects.toBe(failure);
    expect(toast.error).toHaveBeenCalledWith(failure.message);
  });
});
