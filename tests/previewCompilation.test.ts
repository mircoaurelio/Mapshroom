import assert from 'node:assert/strict';
import test from 'node:test';
import { deduplicatePreviewCompile } from '../src/lib/previewCompilation.ts';

test('concurrent variants share compilation within one renderer and release settled work', async () => {
  let count=0;
  let resolve!: (value:number)=>void;
  const owner={};const other={};
  const compile=()=>{count++;return new Promise<number>(r=>{resolve=r;});};
  const a=deduplicatePreviewCompile(owner,'same-code',compile);
  const b=deduplicatePreviewCompile(owner,'same-code',compile);
  assert.equal(a,b);assert.equal(count,1);resolve(7);assert.equal(await b,7);
  const c=deduplicatePreviewCompile(owner,'same-code',async()=>++count);assert.equal(await c,2);
  assert.equal(await deduplicatePreviewCompile(other,'same-code',async()=>++count),3);
});
