import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canCollectAnalytics,
  isOfficialAnalyticsHost,
  isPublicContentPath,
  normalizeAppPath,
  shouldOfferAnalyticsConsent,
} from '../src/lib/analyticsScope.ts';

test('official analytics host is only mapshroom.dev and the desktop app', () => {
  assert.equal(isOfficialAnalyticsHost('mapshroom.dev'), true);
  assert.equal(isOfficialAnalyticsHost('www.mapshroom.dev'), true);
  assert.equal(isOfficialAnalyticsHost('localhost'), false);
  assert.equal(isOfficialAnalyticsHost('mapshroom.pages.dev'), false);
  assert.equal(isOfficialAnalyticsHost('tauri.localhost', 'desktop'), true);
});

test('tutorial and other content pages are excluded from analytics', () => {
  assert.equal(isPublicContentPath('/tutorial'), true);
  assert.equal(isPublicContentPath('/tutorial/'), true);
  assert.equal(isPublicContentPath('/', '#/tutorial'), true);
  assert.equal(isPublicContentPath('/why'), true);
  assert.equal(isPublicContentPath('/shader'), true);
  assert.equal(isPublicContentPath('/creatorchallenge'), true);
  assert.equal(isPublicContentPath('/'), false);
  assert.equal(isPublicContentPath('/download'), false);
  assert.equal(isPublicContentPath('/privacy'), false);
});

test('analytics collection stays on the official product, not content pages', () => {
  assert.equal(
    canCollectAnalytics({
      hostname: 'mapshroom.dev',
      pathname: '/',
      hash: '#/',
    }),
    true,
  );
  assert.equal(
    canCollectAnalytics({
      hostname: 'mapshroom.dev',
      pathname: '/tutorial/',
      hash: '#/tutorial',
    }),
    false,
  );
  assert.equal(
    canCollectAnalytics({
      hostname: 'localhost',
      pathname: '/',
    }),
    false,
  );
});

test('consent is offered only on the official workspace, never as a first-visit wall on content pages', () => {
  assert.equal(
    shouldOfferAnalyticsConsent({
      hostname: 'mapshroom.dev',
      pathname: '/',
    }),
    true,
  );
  assert.equal(
    shouldOfferAnalyticsConsent({
      hostname: 'mapshroom.dev',
      pathname: '/tutorial',
    }),
    false,
  );
  assert.equal(
    shouldOfferAnalyticsConsent({
      hostname: 'mapshroom.dev',
      pathname: '/download',
    }),
    false,
  );
  assert.equal(normalizeAppPath('/tutorial/', '#/tutorial'), '/tutorial');
});
