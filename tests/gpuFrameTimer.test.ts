import assert from 'node:assert/strict';
import test from 'node:test';
import { GpuFrameTimer } from '../src/lib/gpuFrameTimer.ts';

test('GPU queries stay bounded, never read unavailable results and discard disjoint samples', () => {
  let available=false,disjoint=false,created=0,reads=0,deleted=0;
  const gl={getExtension:()=>({TIME_ELAPSED_EXT:1,GPU_DISJOINT_EXT:2}),isContextLost:()=>false,
    getParameter:()=>disjoint,createQuery:()=>({id:++created}),beginQuery:()=>{},endQuery:()=>{},
    QUERY_RESULT_AVAILABLE:3,QUERY_RESULT:4,
    getQueryParameter:(_q:unknown,key:number)=>{if(key===3)return available;reads++;return 7_000_000;},
    deleteQuery:()=>{deleted++;}} as unknown as WebGL2RenderingContext;
  const timer=new GpuFrameTimer(gl);
  for(let i=0;i<20;i++){timer.begin('a');timer.end();timer.poll();}
  assert.equal(created,4);assert.equal(reads,0);
  available=true;assert.deepEqual(timer.poll(),Array.from({length:4},()=>({tag:'a',ms:7})));
  timer.begin('b');timer.end();disjoint=true;assert.deepEqual(timer.poll(),[]);
  assert.equal(reads,4);assert.equal(deleted,5);
  disjoint=false;timer.begin('c');timer.dispose();assert.equal(deleted,6);
});
