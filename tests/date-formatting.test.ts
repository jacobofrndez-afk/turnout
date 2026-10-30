import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dateFormatter } from '../src/lib/date-formatter';
import { localStampAt, localTimeToInstant } from '../src/lib/campaign-plan';
import { proposeAheadCampaign, proposeImmediateCampaign } from '../src/server/workspace/proposal';
import { evergreenProposals } from '../src/server/workspace/evergreen-proposals';
import type { DnaRecord } from '../src/lib/place-dna';

test('reused formats preserve locale, timezone and daylight-saving changes', () => {
  const instants = ['2026-03-08T06:30Z', '2026-03-08T07:30Z', '2026-03-29T00:30Z', '2026-03-29T01:30Z', '2026-10-25T00:30Z', '2026-10-25T01:30Z', '2026-11-01T05:30Z', '2026-11-01T06:30Z'];
  for (const timeZone of ['America/New_York', 'Europe/Paris', 'Asia/Kolkata']) {
    for (const locale of ['en-GB', 'en-US']) {
      const options: Intl.DateTimeFormatOptions = { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
      const expected = new Intl.DateTimeFormat(locale, options);
      for (const instant of instants) {
        const at = new Date(instant);
        assert.deepEqual(dateFormatter(locale, options).formatToParts(at), expected.formatToParts(at));
      }
    }
  }
  assert.equal(localStampAt(Date.parse('2026-10-30T23:30Z'), 'Europe/Paris'), '2026-10-31T00:30');
  assert.equal(localStampAt(Date.parse('2026-10-30T23:30Z'), 'America/New_York'), '2026-10-30T19:30');
  assert.throws(() => localTimeToInstant('2026-11-01T01:30', 'America/New_York'), /occurs twice/);
  assert.throws(() => localTimeToInstant('2026-03-08T02:30', 'America/New_York'), /does not exist/);
});

test('repeated Today planning does not allocate thousands of native date formatters', () => {
  const NativeFormatter = Intl.DateTimeFormat;
  let allocations = 0;
  Intl.DateTimeFormat = new Proxy(NativeFormatter, { construct(target, args) {
    allocations++;
    return Reflect.construct(target, args);
  } });
  try {
    const offers = [
      { id: 'sharing', title: 'Wine & sharing board', description: 'Wine and cheese', price: '24 €' },
      { id: 'beer', title: 'Local craft beers', description: 'Four local beers', price: '18 €' },
      { id: 'late', title: 'Late-night burger & fries', description: 'Served until 1 am', price: '$14' },
    ];
    const dna: DnaRecord = { version: 1, status: 'demo', source: 'Fixture', updatedAt: null, profile: {
      positioning: 'Neighbourhood bar', audience: 'Neighbours', voice: 'warm', exampleLine: 'Come on in.', goal: 'visits', signatureOfferId: 'sharing', boundaries: 'No invented deals', dailyBudgetUsd: 0, leadMinutes: 20, channels: ['storefront'],
    } };
    for (const timezone of ['Europe/Paris', 'America/New_York']) {
      for (let visit = 0; visit < 5; visit++) {
        const now = Date.parse('2026-10-30T15:00Z') + visit * 60000;
        for (const offer of offers) {
          assert.ok(proposeAheadCampaign(dna, offers, timezone, [], now, offer.id));
          proposeImmediateCampaign(dna, offers, timezone, now, offer.id);
        }
        assert.ok(evergreenProposals({ merchantId: 'demo', placeName: 'Demo', dna, offers, evidence: [], timezone, now, moments: [] }).length);
      }
    }
    assert.ok(allocations < 32, `Planning constructed ${allocations} native formatters`);
  } finally { Intl.DateTimeFormat = NativeFormatter; }
});

test('many merchant timezones cannot keep an unbounded formatter cache alive', () => {
  const options: Intl.DateTimeFormatOptions = { timeZone: 'UTC', dateStyle: 'full' };
  const first = dateFormatter('en-GB', options);
  for (const timeZone of Intl.supportedValuesOf('timeZone').slice(0, 128)) dateFormatter('en-GB', { ...options, timeZone });
  assert.notEqual(dateFormatter('en-GB', options), first);
  assert.throws(() => dateFormatter('en-GB', { timeZone: 'Not/A_Timezone' }), RangeError);
});
