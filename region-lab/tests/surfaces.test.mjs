import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareImage, analyze, connectedRegions } from '../algorithms.js';
import { prepareSurface, shapeRegions, finishSurface, mergeToBudget } from '../surfaces.js';
import { lightingFields, exportLighting } from '../lighting.js';

function image(w, h, pixel) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(pixel(x,y), (y * w + x) * 4);
  return prepareImage(data,w,h,8);
}

test('shape separates lobes linked by a thin stem, independently of surface texture', () => {
  const make = textured => image(100,60,(x,y) => {
    const inside = (x-25)**2 + (y-30)**2 < 18**2 || (x-75)**2 + (y-30)**2 < 18**2 || x >= 25 && x <= 75 && y >= 29 && y <= 31;
    return inside ? textured && (x+y)%3 === 0 ? [240,210,40,255] : [30,150,60,255] : [0,0,0,255];
  });
  const a = prepareSurface(make(false)), b = prepareSurface(make(true));
  const one = shapeRegions(a,12), two = shapeRegions(b,12);
  assert.equal(one.count,2);
  assert.notEqual(one.labels[30*100+25],one.labels[30*100+75]);
  assert.deepEqual(one.labels,two.labels);
});

test('surface merging meets its budget, retains connected IDs and does not label the outside', () => {
  const original = image(90,70,(x,y) => x>4 && x<85 && y>4 && y<65 ? [(Math.floor(x/7)%2)*140+40,(Math.floor(y/7)%2)*120+40,90,255] : [0,0,0,255]);
  const surface = prepareSurface(original,35);
  const regions = finishSurface(analyze(surface,'graph',70),surface,5,65);
  assert.ok(regions.count <= 5 && regions.count > 0);
  for (let i = 0; i < surface.n; i++) assert.equal(regions.labels[i] > 0, !!surface.mask[i]);
  const components = connectedRegions(regions.labels,surface.mask,90,70);
  assert.equal(components.count,regions.count);
});

test('texture and gradient direction change only lighting, preserving exact region IDs', () => {
  const original = image(40,30,(x,y) => [50+x*4,50+y*4,100,255]);
  const result = { labels: new Uint32Array(1200).fill(1), count:1, width:40,height:30 };
  const before = result.labels.slice();
  const a = lightingFields(result,original.rgba,{style:'linear',angle:0,texture:0,feather:0});
  const b = lightingFields(result,original.rgba,{style:'linear',angle:180,texture:0,feather:0});
  assert.ok(a.values[15*40+2] < a.values[15*40+37]);
  assert.ok(b.values[15*40+2] > b.values[15*40+37]);
  const textured = lightingFields(result,original.rgba,{style:'linear',texture:50});
  assert.notDeepEqual(textured.values,a.values);
  assert.deepEqual(result.labels,before);
});

test('gradient export clips to original black pixels and never blends neighboring IDs', () => {
  const original = image(4,2,() => [100,100,100,255]);
  const result = { labels:new Uint32Array([1,1,2,2,1,1,2,2]),count:2,width:4,height:2 };
  const native = new Uint8ClampedArray(8*4*4).fill(255); native.set([0,0,0,255],0);
  const out = exportLighting(result,original.rgba,8,4,native,{style:'linear',angle:0,texture:0,feather:0,black:8},true);
  assert.deepEqual([...out.slice(0,4)],[0,0,0,255]);
  // Each local ramp restarts at the neighboring region, with no interpolation across their boundary.
  assert.ok(out[(2*8+3)*4] > 220);
  assert.ok(out[(2*8+4)*4] < 50);
});

test('empty foreground yields empty zones and a black lighting field', () => {
  const original = image(30,20,() => [0,0,0,255]);
  const surface = prepareSurface(original,65), result = finishSurface(shapeRegions(surface,12),surface,12,65);
  assert.equal(result.count,0);
  assert.ok(lightingFields(result,original.rgba).alpha.every(v=>v===0));
});

test('global gradients feather only the silhouette, without dark seams between zones', () => {
  const result = { labels: Uint32Array.from({length: 400},(_,i) => i%20 < 10 ? 1 : 2),count:2,width:20,height:20 };
  const rgba = new Uint8ClampedArray(1600).fill(255);
  const fields = lightingFields(result,rgba,{style:'global',feather:2});
  assert.equal(fields.alpha[10*20+9],1);
  assert.equal(fields.alpha[10*20+10],1);
  assert.ok(fields.alpha[0]<1);
});

test('a strong learned edge protects the corresponding boundary while adjacent regions merge', () => {
  const original = image(40,40,()=>[100,100,100,255]);
  const labels = Uint32Array.from({length:1600},(_,i)=>1+(i%40>=20?1:0)+(i>=800?2:0));
  const edges = Uint8Array.from({length:1600},(_,i)=>Math.abs(i%40-19.5)<2?255:0);
  const result = mergeToBudget({labels,count:4},original,2,edges);
  assert.equal(result.count,2);
  assert.equal(result.labels[10*40+10],result.labels[30*40+10]);
  assert.equal(result.labels[10*40+30],result.labels[30*40+30]);
  assert.notEqual(result.labels[10*40+10],result.labels[10*40+30]);
});

test('compact proposals merge into substantial surfaces instead of one background and tiny decorations', () => {
  const original = image(80,60,(x,y)=>[80+(x%5)*5,90+(y%5)*5,100,255]);
  const surface = prepareSurface(original,65);
  const result = finishSurface(analyze(surface,'slic',50),surface,8,65);
  const sizes = new Uint32Array(result.count+1);
  for (const id of result.labels) if (id) sizes[id]++;
  assert.equal(result.count,8);
  assert.ok(Math.max(...sizes) < original.active * .4);
});
