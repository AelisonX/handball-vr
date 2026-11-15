import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Motion,segmentDistance} from '../src/interaction';
test('throw velocity preserves direction, smooths samples and caps tracking spikes',()=>{const m=new Motion();m.record(new T.Vector3(),0);m.record(new T.Vector3(.1,.2,0),.05);assert.ok(m.velocity().distanceTo(new T.Vector3(2,4,0))<.001);m.record(new T.Vector3(20,20,0),.1);assert.ok(m.velocity().length()<=6.001);m.clear();assert.equal(m.velocity().length(),0);});
test('swept hand contact catches a fast pass between frames',()=>{assert.equal(segmentDistance(new T.Vector3(),new T.Vector3(-1,0,0),new T.Vector3(1,0,0)),0);assert.equal(segmentDistance(new T.Vector3(0,1,0),new T.Vector3(-1,0,0),new T.Vector3(1,0,0)),1);});
