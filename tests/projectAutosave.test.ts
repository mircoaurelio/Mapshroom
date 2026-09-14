import assert from 'node:assert/strict';
import test from 'node:test';
import { createProjectAutosave } from '../src/lib/projectAutosave.ts';

type Project = { sessionId: string; edit: number };

test('rapid edits coalesce, while a continuous drag still saves within maxWait', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const saved: Project[] = [];
  const autosave = createProjectAutosave<Project>({ save: async (p) => { saved.push(p); return true; }, delayMs: 350, maxWaitMs: 1000 });
  try {
    for (let edit = 1; edit <= 5; edit++) {
      autosave.schedule({ sessionId: 'a', edit });
      t.mock.timers.tick(200);
    }
    assert.equal(saved.length, 1, 'maxWait must trigger a save before an explicit flush');
    await autosave.flush();
    assert.deepEqual(saved, [{ sessionId: 'a', edit: 5 }]);
    assert.equal(autosave.hasPending(), false);
  } finally { autosave.stop(); }
});

test('switching sessions preserves pending edits and flush waits for every write', async () => {
  const saved: Project[] = [];
  const autosave = createProjectAutosave<Project>({ save: async (p) => { saved.push(p); return true; } });
  try {
    autosave.schedule({ sessionId: 'a', edit: 1 });
    autosave.schedule({ sessionId: 'b', edit: 2 });
    assert.equal(await autosave.flush(), true);
    assert.deepEqual(saved.map(p => p.sessionId), ['a', 'b']);
    assert.equal(autosave.hasPending(), false);
  } finally { autosave.stop(); }
});

test('edits arriving during a write are saved afterwards and do not report saved early', async () => {
  let complete: (saved: boolean) => void = () => {};
  const saved: Project[] = [];
  const statuses: string[] = [];
  const autosave = createProjectAutosave<Project>({
    save: async (p) => { saved.push(p); return p.edit === 1 ? new Promise<boolean>(resolve => { complete = resolve; }) : true; },
    onStatus: (_id, status) => statuses.push(status),
  });
  try {
    autosave.schedule({ sessionId: 'a', edit: 1 });
    const flushing = autosave.flush();
    autosave.schedule({ sessionId: 'a', edit: 2 });
    complete(true);
    assert.equal(await flushing, true);
    assert.deepEqual(saved.map(p => p.edit), [1, 2]);
    assert.deepEqual(statuses, ['saving', 'saving', 'saved']);
  } finally { autosave.stop(); }
});

test('a failed save keeps the newest edit and retries automatically', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let failing = true;
  const attempts: number[] = [];
  const autosave = createProjectAutosave<Project>({
    save: async (p) => { attempts.push(p.edit); return !failing; }, retryMs: 1000,
  });
  try {
    autosave.schedule({ sessionId: 'a', edit: 1 });
    assert.equal(await autosave.flush(), false);
    assert.equal(autosave.hasPending('a'), true);
    failing = false;
    t.mock.timers.tick(1000);
    assert.deepEqual(attempts, [1, 1], 'the retry timer must save without another user edit');
    assert.equal(await autosave.flush(), true);
    assert.deepEqual(attempts, [1, 1]);
    assert.equal(autosave.hasPending(), false);
    autosave.schedule({ sessionId: 'a', edit: 2 });
    assert.equal(await autosave.flush(), true);
    assert.deepEqual(attempts, [1, 1, 2]);
  } finally { autosave.stop(); }
});
