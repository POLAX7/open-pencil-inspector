import type { FlowIR } from '../../core/src/flow-ir.ts';

export type NavigationTransitionKind = 'push' | 'sheet' | 'modal' | 'replace';

export interface NavigationScaffold {
  rootScreenId: string;
  screens: Array<{ id: string; designNodeId?: string; presentation?: string }>;
  transitions: Array<{ from: string; event: string; to: string; kind: NavigationTransitionKind }>;
  unresolvedActions: Array<{ screenId: string; nodeId?: string; event: string; reason: string }>;
}

export function runtimeRouteCaseId(index: number): string {
  return `route-${index + 1}`;
}

function transitionKind(flow: FlowIR, targetId: string): NavigationTransitionKind {
  const presentation = flow.screens.find((screen) => screen.id === targetId)?.presentation;
  if (presentation === 'sheet') return 'sheet';
  if (presentation === 'modal') return 'modal';
  if (presentation === 'replace') return 'replace';
  return 'push';
}

export function buildNavigationScaffold(flow: FlowIR): NavigationScaffold {
  const root = flow.screens.find((screen) => screen.presentation === 'root') ?? flow.screens[0];
  const screenIds = new Set(flow.screens.map((screen) => screen.id));
  return {
    rootScreenId: root?.id ?? 'root',
    screens: flow.screens.map((screen) => ({
      id: screen.id,
      ...(screen.designNodeId ? { designNodeId: screen.designNodeId } : {}),
      ...(screen.presentation ? { presentation: screen.presentation } : {}),
    })),
    transitions: flow.transitions
      .filter((transition) => screenIds.has(transition.from) && screenIds.has(transition.to))
      .map((transition) => ({
        from: transition.from,
        event: transition.event,
        to: transition.to,
        kind: transitionKind(flow, transition.to),
      })),
    unresolvedActions: (flow.actions ?? []).map((action) => ({
      screenId: action.screenId,
      ...(action.nodeId ? { nodeId: action.nodeId } : {}),
      event: action.event,
      reason: action.effect,
    })),
  };
}
