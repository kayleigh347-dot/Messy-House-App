import test from 'node:test';
import assert from 'node:assert/strict';
import {periodStart} from '../periods.js';
import {taskStats} from '../task-stats.js';
import {normalize,priorityOf} from '../v2-state.js';
import {taskDeadline} from '../task-extras.js';
test('Today and This week use local midnight and Monday, including Sunday',()=>{for(const date of [new Date(2026,9,2,16),new Date(2026,9,4,23,59),new Date(2026,9,26,12)]){const today=new Date(periodStart('today',+date)),week=new Date(periodStart('week',+date));assert.equal(today.getDate(),date.getDate());assert.equal(today.getHours(),0);assert.equal(week.getDay(),1);assert.equal(week.getHours(),0);assert.ok(+week<=+date)}});
test('today counts midnight once and excludes the preceding second',()=>{const now=new Date(2026,9,2,12),midnight=periodStart('today',+now),state=normalize({tasks:[],side:[],wins:[{id:'before',text:'Old',at:new Date(midnight-1000).toISOString()},{id:'after',text:'New',at:new Date(midnight).toISOString()}]});assert.equal(taskStats(state,{now:+now,days:'today'}).periodCount,1)});
test('overdue recurrence becomes attention automatically, while pausing clears its deadline',()=>{const t={priority:'mid',created:'2020-01-01',bucket:'now',recurrence:{kind:'days',every:1}};assert.equal(priorityOf(t),'high');assert.ok(taskDeadline(t)<Date.now());assert.equal(priorityOf({...t,pausedAt:new Date().toISOString()}),'mid');assert.equal(taskDeadline({...t,pausedAt:'2026-10-02'}),null)});
