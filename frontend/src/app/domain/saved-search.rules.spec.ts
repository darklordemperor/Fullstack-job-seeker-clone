import { savedSearchError } from './saved-search.rules';
import { SavedSearchInput } from './saved-search.model';
const base:SavedSearchInput={name:'Java',query:'Java',location:'',salaryMin:null,salaryMax:null,currency:''};
describe('Saved search validation',()=>{
  it.each([
    {name:''},{name:'x'.repeat(81)},{query:'x'.repeat(151)},{location:'x'.repeat(101)},
    {salaryMin:-1},{salaryMax:1.5},{salaryMin:2147483648},{salaryMin:NaN},
    {salaryMin:200,salaryMax:100,currency:'THB'},{salaryMin:0,currency:''},{salaryMax:1,currency:'123'},
    {query:' ',location:' '},
  ])('rejects invalid input %j',patch=>expect(savedSearchError({...base,...patch})).not.toBeNull());
  it.each([
    {},{query:'',location:'Bangkok'},
    {query:'',salaryMin:0,currency:'thb'},{query:'',salaryMax:0,currency:'USD'},
    {salaryMin:100,salaryMax:100,currency:'THB'},
  ])('accepts valid input %j',patch=>expect(savedSearchError({...base,...patch})).toBeNull());
});
