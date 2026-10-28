import { describe, expect, test } from 'bun:test';
import type { DesignDocument } from '../../core/src/design-ast.ts';
import { discoverScreens } from '../src/screen-discovery.ts';

function documentWithNestedScreens(): DesignDocument {
  return {
    id: 'fixture',
    name: 'Fixture',
    nodes: [{
      id: '0:88',
      name: 'Food App',
      type: 'SECTION',
      layout: { x: 0, y: 0, width: 1200, height: 1800 },
      children: [{
        id: '0:560',
        name: 'Payment Address',
        type: 'FRAME',
        layout: { x: 24, y: 24, width: 360, height: 800 },
        children: [],
        unsupportedProperties: [],
        provenance: [{ source: 'fig', reference: 'fixture.fig', field: 'node:0:560' }],
      }],
      unsupportedProperties: [],
      provenance: [{ source: 'fig', reference: 'fixture.fig', field: 'node:0:88' }],
    }],
    tokens: [],
    assets: [],
    diagnostics: [],
    provenance: [{ source: 'fig', reference: 'fixture.fig', field: 'document' }],
  };
}

describe('discoverScreens', () => {
  test('discovers nested phone-sized frames instead of treating the outer section as the screen', () => {
    const report = discoverScreens(documentWithNestedScreens(), 'fixture.fig', 'selected-subtree');

    expect(report.screens).toHaveLength(1);
    expect(report.screens[0]).toMatchObject({
      nodeId: '0:560',
      title: 'Payment Address',
      parentNodeId: '0:88',
      confidence: 'phone-sized-frame',
      frame: { width: 360, height: 800 },
    });
  });

  test('falls back to explicit roots when no phone-sized frame exists', () => {
    const document = documentWithNestedScreens();
    document.nodes[0].children = [];
    const report = discoverScreens(document, 'fixture.fig', 'page');

    expect(report.screens).toHaveLength(1);
    expect(report.screens[0]).toMatchObject({ nodeId: '0:88', confidence: 'explicit-root' });
  });
});
