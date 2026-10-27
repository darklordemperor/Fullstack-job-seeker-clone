import { signal, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { LoginComponent } from './login/login.component';
import { RegisterEmployerComponent } from './register-employer/register-employer.component';
import { RegisterJobSeekerComponent } from './register-job-seeker/register-job-seeker.component';

describe.each([
  [LoginComponent, 'login'], [RegisterEmployerComponent, 'registerEmployer'], [RegisterJobSeekerComponent, 'registerJobSeeker'],
] as [Type<unknown>, 'login' | 'registerEmployer' | 'registerJobSeeker'][])('%s form', (component, method) => {
  it('associates labels, rejects invalid input and submits valid input once', async () => {
    const auth = { loading: signal(false), login: vi.fn(), registerEmployer: vi.fn(), registerJobSeeker: vi.fn() };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthStore, useValue: auth }] });
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges(); await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const submit = () => root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    submit(); fixture.detectChanges();
    expect(auth[method]).not.toHaveBeenCalled();
    expect(root.querySelector('[role="alert"]')).not.toBeNull();
    for (const [name, value] of [['email', 'person@example.com'], ['password', 'StrongPassword123!'], ['displayName', 'Example Person']]) {
      const input = root.querySelector<HTMLInputElement>(`[name="${name}"]`);
      if (!input) continue;
      expect(root.querySelector(`label[for="${input.id}"]`)).not.toBeNull();
      input.value = value; input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable(); submit();
    expect(auth[method]).toHaveBeenCalledTimes(1);
    expect(auth[method]).toHaveBeenCalledWith(expect.objectContaining({ email: 'person@example.com', password: 'StrongPassword123!' }));
    auth.loading.set(true); fixture.detectChanges(); submit();
    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    expect(auth[method]).toHaveBeenCalledTimes(1);
  });
});
