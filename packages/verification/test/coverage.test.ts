import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCoverageReport } from '../src/coverage.ts';

test('coverage preserves every design node and audits unsupported or ignored mappings', () => {
  const report = buildCoverageReport({
    design: {
      id: 'd', name: 'Design', tokens: [], assets: [], diagnostics: [], provenance: [],
      nodes: [
        { id: 'screen', name: 'Home', type: 'FRAME', children: [
          { id: 'title', name: 'Title', type: 'TEXT', children: [], unsupportedProperties: [], provenance: [] },
          { id: 'unknown', name: 'Unknown', type: 'UNKNOWN', children: [], unsupportedProperties: ['type:UNKNOWN'], provenance: [] },
          { id: 'ignored', name: 'Ignored', type: 'VECTOR', children: [], unsupportedProperties: [], provenance: [] },
        ], unsupportedProperties: [], provenance: [] },
      ],
    },
    flow: { version: '1.0', screens: [{ id: 'home', designNodeId: 'screen', provenance: [] }], transitions: [], states: [], conflicts: [], diagnostics: [] },
    ignoredNodeReasons: { ignored: 'intentionally excluded by Spec' },
  });

  assert.equal(report.nodes.total, 4);
  assert.equal(report.nodes.entries.length, 4);
  assert.equal(report.nodes.byKind['ignored-with-reason'], 1);
  assert.ok(report.audit.some((entry) => entry.reason.includes('intentionally excluded')));
  assert.ok(report.audit.some((entry) => entry.reason.includes('unsupported')));
});

test('flow coverage records blockers instead of silently dropping unresolved screens, states, or transitions', () => {
  const report = buildCoverageReport({
    design: { id: 'd', name: 'Design', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: {
      version: '1.0',
      screens: [{ id: 'home', provenance: [] }, { id: 'detail', provenance: [] }],
      states: [{ screenId: 'detail', name: 'loading', provenance: [] }],
      transitions: [{ from: 'home', event: 'tap detail', to: 'detail', provenance: [] }],
      conflicts: [], diagnostics: [],
    },
  });

  assert.equal(report.flow.screens.every((entry) => entry.status === 'blocked'), true);
  assert.equal(report.flow.states[0]?.status, 'blocked');
  assert.equal(report.flow.transitions[0]?.status, 'blocked');
  assert.ok(report.audit.filter((entry) => entry.blocking).length >= 3);
});
