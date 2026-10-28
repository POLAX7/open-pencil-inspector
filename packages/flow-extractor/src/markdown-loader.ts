import type { FlowIR, FlowProvenance } from '../../core/src/flow-ir.ts';
import { validateFlowIR } from '../../core/src/flow-schema.ts';

export function loadMarkdownFlow(input: string, reference: string): FlowIR {
  const origin: FlowProvenance = { source: 'markdown', reference };
  const screens: FlowIR['screens'] = [];
  const transitions: FlowIR['transitions'] = [];
  const states: FlowIR['states'] = [];
  const diagnostics: string[] = [];
  let currentScreen: string | undefined;

  for (const [index, line] of input.split(/\r?\n/).entries()) {
    const heading = line.match(/^#{1,3}\s+(?:Screen:\s*)?(.+)$/i);
    if (heading) {
      currentScreen = heading[1].trim().toLowerCase().replace(/\s+/g, '-');
      screens.push({ id: currentScreen, title: heading[1].trim(), provenance: [{ ...origin, field: `line:${index + 1}` }] });
      continue;
    }
    const transition = line.match(/^\s*[-*]\s+(?:on\s+)?(.+?)\s+(?:goes|navigates|進入|前往)\s+(?:to\s+)?(.+)$/i);
    if (transition && currentScreen) {
      transitions.push({ from: currentScreen, event: transition[1].trim(), to: transition[2].trim().toLowerCase().replace(/\s+/g, '-'), provenance: [{ ...origin, field: `line:${index + 1}` }] });
      continue;
    }
    const state = line.match(/^\s*[-*]\s+(?:state|狀態)[:：]\s*(.+)$/i);
    if (state && currentScreen) {
      states.push({ screenId: currentScreen, name: state[1].trim(), provenance: [{ ...origin, field: `line:${index + 1}` }] });
    }
  }
  if (screens.length === 0) diagnostics.push(`No screen headings found in ${reference}`);
  if (transitions.some((item) => !screens.some((screen) => screen.id === item.to))) diagnostics.push(`Some transition targets are not declared in ${reference}`);
  return validateFlowIR({ version: '1.0', screens, transitions, states, conflicts: [], diagnostics });
}
