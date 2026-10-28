export type RuntimeGateStatus = 'pass' | 'blocked' | 'pending';

export interface RuntimeGateResult {
  status: RuntimeGateStatus;
  message: string;
  missing?: string[];
}

export function evaluateSemanticTreeGate(expectedIdentifiers: string[], observedIdentifiers?: string[]): RuntimeGateResult {
  if (observedIdentifiers === undefined) return { status: 'pending', message: 'Semantic UI tree evidence is unavailable.' };
  const observed = new Set(observedIdentifiers);
  const missing = expectedIdentifiers.filter((identifier) => !observed.has(identifier));
  return missing.length === 0
    ? { status: 'pass', message: 'All expected semantic UI identifiers were observed.' }
    : { status: 'blocked', missing, message: `Missing semantic UI identifiers: ${missing.join(', ')}` };
}

export function evaluateNavigationGate(expectedRoutes: string[], observedRoutes?: string[]): RuntimeGateResult {
  if (observedRoutes === undefined) return { status: 'pending', message: 'Navigation interaction evidence is unavailable.' };
  const matches = expectedRoutes.length === observedRoutes.length && expectedRoutes.every((route, index) => route === observedRoutes[index]);
  return matches
    ? { status: 'pass', message: 'Observed navigation sequence matches Flow IR.' }
    : { status: 'blocked', message: `Observed navigation sequence does not match Flow IR: expected ${expectedRoutes.join(' -> ')}, observed ${observedRoutes.join(' -> ')}` };
}
