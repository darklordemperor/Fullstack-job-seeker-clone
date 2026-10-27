import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HomeComponent } from './home.component';

describe('Home search', () => {
  it('submits keyword and location as job-list query parameters', async () => {
    const router = { navigate: vi.fn().mockResolvedValue(true) };
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }] });
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges(); await fixture.whenStable();
    for (const [name, value] of [['keyword', ' Angular '], ['location', ' Bangkok ']]) {
      const input = fixture.nativeElement.querySelector('[name="' + name + '"]') as HTMLInputElement;
      input.value = value; input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(router.navigate).toHaveBeenCalledWith(['/jobs'], { queryParams: { q: 'Angular', location: 'Bangkok' } });
  });
});
