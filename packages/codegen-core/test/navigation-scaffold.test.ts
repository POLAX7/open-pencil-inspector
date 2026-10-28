import { describe, expect, test } from 'bun:test';
import type { FlowIR } from '../../core/src/flow-ir.ts';
import { buildNavigationScaffold } from '../src/navigation-scaffold.ts';

const flow: FlowIR = {
  version: '1.0',
  screens: [
    { id: 'food-details', designNodeId: 'details', presentation: 'root', provenance: [] },
    { id: 'payment-address', designNodeId: 'payment', presentation: 'push', provenance: [] },
  ],
  transitions: [{ from: 'food-details', event: 'tap Order Now', to: 'payment-address', provenance: [] }],
  states: [], conflicts: [], diagnostics: [],
};

describe('buildNavigationScaffold', () => {
  test('turns a confirmed Flow transition into a shared route edge', () => {
    const scaffold = buildNavigationScaffold(flow);

    expect(scaffold.rootScreenId).toBe('food-details');
    expect(scaffold.screens).toEqual([
      { id: 'food-details', designNodeId: 'details', presentation: 'root' },
      { id: 'payment-address', designNodeId: 'payment', presentation: 'push' },
    ]);
    expect(scaffold.transitions).toEqual([{
      from: 'food-details', event: 'tap Order Now', to: 'payment-address', kind: 'push',
    }]);
  });

  test('does not infer a route from diagnostics or canvas order', () => {
    const scaffold = buildNavigationScaffold({ ...flow, transitions: [], diagnostics: ['unresolved action-only control'] });

    expect(scaffold.transitions).toEqual([]);
    expect(scaffold.unresolvedActions).toEqual([]);
  });

  test('retains confirmed action-only interactions as unresolved scaffold actions', () => {
    const scaffold = buildNavigationScaffold({
      ...flow,
      transitions: [],
      actions: [{ screenId: 'food-details', nodeId: 'edit-profile', event: 'tap Edit Profile', effect: 'interactive-without-destination', provenance: [] }],
    });

    expect(scaffold.transitions).toEqual([]);
    expect(scaffold.unresolvedActions).toEqual([{
      screenId: 'food-details', nodeId: 'edit-profile', event: 'tap Edit Profile', reason: 'interactive-without-destination',
    }]);
  });
});
