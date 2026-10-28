import { describe, expect, test } from 'bun:test';
import { buildScreenAcceptanceManifest } from '../src/screen-manifest.ts';

describe('buildScreenAcceptanceManifest', () => {
  test('preserves every declared screen and marks the selected primary screen', () => {
    const manifest = buildScreenAcceptanceManifest(
      'FoodApp',
      {
        id: 'food', name: 'FoodApp', tokens: [], assets: [], diagnostics: [], provenance: [],
        nodes: [
          { id: 'home-node', name: 'Home', type: 'FRAME', layout: { width: 430, height: 932 }, children: [], unsupportedProperties: [], provenance: [] },
          { id: 'payment-node', name: 'Payment', type: 'FRAME', layout: { width: 430, height: 932 }, children: [], unsupportedProperties: [], provenance: [] },
        ],
      },
      {
        version: '1.0',
        screens: [
          { id: 'home', title: 'Home', designNodeId: 'home-node', presentation: 'root', provenance: [] },
          { id: 'payment', title: 'Payment', designNodeId: 'payment-node', presentation: 'push', provenance: [] },
        ],
        transitions: [{ from: 'home', event: 'tap payment', to: 'payment', provenance: [] }],
        states: [], conflicts: [], diagnostics: [],
      },
    );

    expect(manifest).toEqual({
      schemaVersion: '1.0',
      featureName: 'FoodApp',
      primaryScreenId: 'home',
      renderedNodeId: 'home-node',
      screens: [
        { id: 'home', title: 'Home', designNodeId: 'home-node', presentation: 'root', generated: true, layout: { width: 430, height: 932 } },
        { id: 'payment', title: 'Payment', designNodeId: 'payment-node', presentation: 'push', generated: false, layout: { width: 430, height: 932 } },
      ],
      transitions: [{ from: 'home', event: 'tap payment', to: 'payment' }],
      runtimeRouteCases: [{ id: 'route-1', from: 'home', event: 'tap payment', to: 'payment', kind: 'push' }],
      unresolvedActions: [],
    });
  });
});
