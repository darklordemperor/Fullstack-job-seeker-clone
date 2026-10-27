import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavbarComponent } from './navbar.component';
import { AuthStore } from '../../auth/auth.store';
import { NotificationsStore } from '../../notifications/notifications.store';

describe('Mobile navigation', () => {
  it('exposes disclosure state, closes competing panels and restores keyboard focus', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: NotificationsStore, useValue: { unreadCount: signal(0), countError: signal(false) } },
      { provide: AuthStore, useValue: {
        isAuthenticated: signal(true), isJobSeeker: signal(false),
        isEmployer: signal(true), isAdmin: signal(false), logout: vi.fn(),
      } },
    ] });
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges(); await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const language = root.querySelector<HTMLButtonElement>('[aria-controls="language-options"]')!;
    const account = root.querySelector<HTMLButtonElement>('[aria-controls="account-options"]')!;
    language.click(); fixture.detectChanges();
    expect(language.getAttribute('aria-expanded')).toBe('true');
    account.click(); fixture.detectChanges();
    expect(language.getAttribute('aria-expanded')).toBe('false');
    expect(account.getAttribute('aria-expanded')).toBe('true');
    const link = root.querySelector<HTMLAnchorElement>('#account-options a')!;
    link.focus(); link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(account.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(account);
    language.click(); fixture.detectChanges();
    const choice = root.querySelector<HTMLButtonElement>('#language-options button')!;
    choice.focus(); choice.click(); fixture.detectChanges();
    expect(language.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(language);
  });
  it.each([
    ['public', '/auth/register-employer'], ['candidate', '/job-seeker/my-applications'],
    ['employer', '/employer/manage-jobs'], ['admin', '/admin/applications'],
  ])('exposes %s routes and closes with Escape or navigation', async (role, link) => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), {provide:NotificationsStore,useValue:{unreadCount:signal(0),countError:signal(false)}}, { provide: AuthStore, useValue: {
      isAuthenticated: signal(role !== 'public'), isJobSeeker: signal(role === 'candidate'),
      isEmployer: signal(role === 'employer'), isAdmin: signal(role === 'admin'), logout: vi.fn(),
    } }] });
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges(); await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const toggle = root.querySelector<HTMLButtonElement>('[aria-controls="mobile-navigation"]')!;
    toggle.click(); fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector(`#mobile-navigation a[href="${link}"]`)).not.toBeNull();
    root.querySelector('header')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(root.querySelector('#mobile-navigation')).toBeNull();
    toggle.click(); fixture.detectChanges();
    root.querySelector('#mobile-navigation')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});
