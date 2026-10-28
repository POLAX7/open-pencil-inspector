import type { FlowIR } from '../../core/src/flow-ir.ts';
import { buildNavigationScaffold, runtimeRouteCaseId, type NavigationScaffold } from '../../codegen-core/src/navigation-scaffold.ts';

export interface RuntimeRouteCase {
  id: string;
  from: string;
  event: string;
  to: string;
  kind: NavigationScaffold['transitions'][number]['kind'];
}

export interface RuntimeRoutePlan {
  rootScreenId: string;
  cases: RuntimeRouteCase[];
  unresolvedActions: NavigationScaffold['unresolvedActions'];
}

export function buildRuntimeRoutePlan(flow: FlowIR, scaffold = buildNavigationScaffold(flow)): RuntimeRoutePlan {
  return {
    rootScreenId: scaffold.rootScreenId,
    cases: scaffold.transitions.map((transition, index) => ({
      id: runtimeRouteCaseId(index),
      from: transition.from,
      event: transition.event,
      to: transition.to,
      kind: transition.kind,
    })),
    unresolvedActions: scaffold.unresolvedActions,
  };
}
