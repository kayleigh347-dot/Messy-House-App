import test from 'node:test';
import assert from 'node:assert/strict';
import {ensurePerson,householdScoreboard,personName,unseenActivity} from '../household.js';
import {calendarMonthRange,localDateKey} from '../calendar.js';

test('household members receive one point for each attributed completion',()=>{
 const state={householdPeople:[],wins:[{id:'a',completedBy:'one',completedByName:'Kayleigh'},{id:'b',completedBy:'one',completedByName:'Kayleigh'},{id:'old'}]};
 ensurePerson(state,{id:'two',email:'alex.smith@example.com'});
 assert.equal(personName('alex.smith@example.com'),'Alex Smith');
 assert.deepEqual(householdScoreboard(state).map(({name,points})=>[name,points]),[['Kayleigh',2],['Alex Smith',0]]);
});

test('home activity only counts unseen additions from another person',()=>{
 const state={shopping:[{createdBy:'other',createdAt:'2026-09-24T10:00:00Z'},{createdBy:'me',createdAt:'2026-09-24T11:00:00Z'}],notes:[{createdBy:'other',createdAt:'2026-09-24T09:00:00Z'}]};
 assert.deepEqual(unseenActivity(state,{personId:'me',shoppingSeen:Date.parse('2026-09-24T09:30:00Z'),notesSeen:Date.parse('2026-09-24T09:30:00Z')}),{shopping:1,notes:0});
});

test('calendar date helpers retain local dates and cover a complete month grid',()=>{
 assert.equal(localDateKey(new Date(2026,8,24,23,59)),'2026-09-24');
 const range=calendarMonthRange(new Date(2026,8,15));assert.equal(range.start.getDay(),0);assert.equal(range.end.getDay(),6);assert.equal(Math.round((range.end-range.start)/86400000),42);
});
