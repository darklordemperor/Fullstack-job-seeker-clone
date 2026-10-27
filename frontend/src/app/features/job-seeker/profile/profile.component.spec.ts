import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfileComponent } from './profile.component';
import { ProfileStore } from './profile.store';

describe('Profile load failure', () => {
  it('offers a retry instead of telling an authenticated user to sign in', async () => {
    const store = { profile: signal(null), loading: signal(false), error: signal('Offline'), completeness: signal(0), loadData: vi.fn() };
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.overrideComponent(ProfileComponent, { set: { providers: [{ provide: ProfileStore, useValue: store }] } });
    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Unable to load your profile');
    expect(fixture.nativeElement.textContent).not.toContain('Sign in');
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    expect(store.loadData).toHaveBeenCalledTimes(2);
    store.loading.set(true); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading your profile');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });
});
