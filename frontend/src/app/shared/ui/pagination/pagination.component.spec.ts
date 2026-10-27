import { TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination.component';

describe('Pagination', () => {
  it('bounds a large result set to five page buttons with the active page identified', () => {
    const fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentRef.setInput('page', 500); fixture.componentRef.setInput('totalPages', 1000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('button')).toHaveLength(7);
    expect(fixture.nativeElement.querySelector('[aria-current="page"]').textContent.trim()).toBe('501');
    const change = vi.fn(); fixture.componentInstance.pageChange.subscribe(change);
    fixture.nativeElement.querySelector('button').click();
    expect(change).toHaveBeenCalledWith(499);
  });
});
