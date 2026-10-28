import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { OpenPencilCliAdapter } from '../../openpencil-cli/src/adapter.ts';
import { OpenPencilCliClient } from '../../openpencil-cli/src/client.ts';
import { inferFlowFromDesign } from '../../flow-extractor/src/fig-flow.ts';
import { discoverScreens } from '../../flow-extractor/src/screen-discovery.ts';
import { buildDesignEvidence } from '../../codegen-core/src/design-evidence.ts';
import { buildNativePatternMapping } from '../../native-patterns/src/evidence.ts';
import { buildNavigationScaffold } from '../../codegen-core/src/navigation-scaffold.ts';
import { loadMarkdownFlow } from '../../flow-extractor/src/markdown-loader.ts';
import { mergeFlowSources } from '../../flow-extractor/src/merge-flow.ts';
import { loadStructuredFlow } from '../../flow-extractor/src/structured-loader.ts';
import { resolveFlowScope } from '../../flow-extractor/src/resolve-flow.ts';
import { exportDesignAssets, writeAssetManifest } from './assets.ts';
import { generateIOSFiles, generateIOSPackageFiles, iosPackageSourceDirectories, writeIOSPackageManifest, type IOSPlatform } from './generate.ts';
import { swiftTypeName } from '../../codegen-core/src/contracts.ts';
import { verifyScreenshot } from '../../verification/src/screenshot-diff.ts';
import { buildCoverageReport } from '../../verification/src/coverage.ts';
import { writeDesignPackage } from '../../design-package/src/writer.ts';
import { validateDesignPackage } from '../../design-package/src/schema.ts';
import { buildScreenAcceptanceManifest } from './screen-manifest.ts';
import { buildRuntimeRoutePlan } from '../../verification/src/runtime-route-plan.ts';
import { extractLayoutContracts } from '../../layout-contracts/src/extractor.ts';
import { compileConfirmedFlow, confirmEnvelope, saveDecisions } from '../../flow-confirmation/src/decisions.ts';
import { proposeConfirmation, readConfirmation, writeConfirmation } from './confirmation-files.ts';
import type { FlowDecision } from '../../flow-confirmation/src/contracts.ts';
import { validateConfirmationEnvelope } from '../../flow-confirmation/src/schema.ts';
import { buildScreenContext } from './screen-context.ts';
import { extractScreenContract } from '../../codegen-core/src/screen-contract-extractor.ts';
import { readSelectionManifest, resolveInspectOptions, selectionProvenance } from './selection-scope.ts';
import { cliExitCode, formatCliError } from './errors.ts';
import { assertExistingIOSIntegrationPlatform, validateExistingIOSIntegrationProfile } from '../../codegen-core/src/existing-ios-integration.ts';
import { bindScreenContractsToFlow } from '../../codegen-core/src/screen-contract-flow-binding.ts';
import type { ScreenContract } from '../../codegen-core/src/screen-contract.ts';

const DEFAULT_HYDRATE_DEPTH = 6;
const CLI_USAGE = [
  'Usage: open-pencil-inspector CLI',
  '',
  'Scope options for .fig commands:',
  '  --page <name>                 inspect one page by name',
  '  --page-id <id>                inspect one page by id',
  '  --node <id>                   select one or more roots (requires --page/--page-id)',
  '  --selection <selection.json>  load an explicit page/subtree selection manifest',
  '  --integration <profile.json> use an explicit existing iOS App integration profile',
  '',
  'Commands:',
  '  pages <file.fig>',
  '  inspect <file.fig> [scope options]',
  '  screen-discovery <file.fig> --output <report.json> [scope options]',
  '  screen-contract <file.fig> --node <node-id> --output <contract.json> [scope options]',
  '  screen-context <file.fig> --node <id> [scope options]',
  '  propose-flow <file.fig> --output <candidate.json> [scope options]',
  '  preflight <file.fig> --output <directory> [scope options]',
  '  generate <file.fig> --output <directory> [scope options]',
  '  save-flow-decisions, confirm-flow, validate-flow, validate, report, verify',
].join('\n');

function processRunner(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', reject);
    child.on('close', (exitCode) => resolve({ stdout, stderr, exitCode: exitCode ?? 1 }));
  });
}

async function readOptionalIntegrationProfile(directory: string): Promise<unknown | undefined> {
  try {
    const contents = await readFile(join(directory, 'integration.json'), 'utf8');
    const document = JSON.parse(contents) as { integration?: unknown };
    return document.integration;
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as Error & { code?: string }).code === 'ENOENT') return undefined;
    throw error;
  }
}

export async function runCli(argv: string[], adapter = new OpenPencilCliAdapter(new OpenPencilCliClient(processRunner))) {
  const [command, filePath, ...rest] = argv;
  if (command === '--help' || command === '-h' || command === 'help') return CLI_USAGE;
  if (command === 'pages' && filePath) {
    return JSON.stringify({ source: filePath, pages: await adapter.listPages(filePath) }, null, 2);
  }
  if (command === 'screen-context' && filePath) {
    const nodeIndex = rest.indexOf('--node');
    const nodeId = nodeIndex >= 0 ? rest[nodeIndex + 1] : undefined;
    if (!nodeId) throw new Error('Usage: screen-context <file.fig> --node <node-id>');
    const scope = await resolveInspectOptions(adapter, filePath, rest);
    const design = await adapter.inspect(filePath, { ...scope, hydrate: true, hydrateDepth: DEFAULT_HYDRATE_DEPTH, hydrateRootCount: 1 });
    const flow = resolveFlowScope(design, inferFlowFromDesign(design, filePath), filePath);
    return JSON.stringify(buildScreenContext(design, flow, nodeId), null, 2);
  }
  if (command === 'screen-discovery' && filePath) {
    const outputIndex = rest.indexOf('--output');
    const outputPath = outputIndex >= 0 ? rest[outputIndex + 1] : undefined;
    if (!outputPath) throw new Error('Usage: screen-discovery <file.fig> --output <report.json> [scope options]');
    const scope = await resolveInspectOptions(adapter, filePath, rest);
    const design = await adapter.inspect(filePath, {
      ...scope,
      hydrate: true,
      hydrateDepth: DEFAULT_HYDRATE_DEPTH,
      hydrateRootCount: 1,
      hydrateStrategy: 'tree',
    });
    const report = discoverScreens(design, filePath, scope.rootNodeIds ? 'selected-subtree' : 'page');
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    return JSON.stringify({ output: outputPath, screens: report.screens.length, diagnostics: report.diagnostics }, null, 2);
  }
  if (command === 'screen-contract' && filePath) {
    const nodeIndex = rest.indexOf('--node');
    const nodeId = nodeIndex >= 0 ? rest[nodeIndex + 1] : undefined;
    const outputIndex = rest.indexOf('--output');
    const outputPath = outputIndex >= 0 ? rest[outputIndex + 1] : undefined;
    if (!nodeId || !outputPath) throw new Error('Usage: screen-contract <file.fig> --node <node-id> --output <contract.json>');
    const scope = await resolveInspectOptions(adapter, filePath, rest);
    const design = await adapter.inspect(filePath, { ...scope, hydrate: true, hydrateDepth: DEFAULT_HYDRATE_DEPTH, hydrateRootCount: 1, hydrateStrategy: 'nodes' });
    const extraction = extractScreenContract(design, nodeId, filePath);
    await writeFile(outputPath, `${JSON.stringify({ screenContracts: [extraction.contract] }, null, 2)}\n`, 'utf8');
    return JSON.stringify({ output: outputPath, id: extraction.contract.id, designNodeId: nodeId, components: extraction.contract.components.length, assets: extraction.contract.assets.length, diagnostics: extraction.diagnostics }, null, 2);
  }
  if (command === 'inspect' && filePath) {
    const document = await adapter.inspect(filePath, await resolveInspectOptions(adapter, filePath, rest));
    return JSON.stringify(document, null, 2);
  }
  if (command === 'propose-flow' && filePath) {
    const outputIndex = rest.indexOf('--output');
    const outputPath = outputIndex >= 0 ? rest[outputIndex + 1] : undefined;
    if (!outputPath) throw new Error('Usage: propose-flow <file.fig> --output <candidate.json>');
    const scope = await resolveInspectOptions(adapter, filePath, rest);
    const design = await adapter.inspect(filePath, { ...scope, hydrate: true, hydrateDepth: DEFAULT_HYDRATE_DEPTH, hydrateRootCount: 1, hydrateStrategy: 'tree' });
    const selectionIndex = rest.indexOf('--selection');
    const selection = selectionIndex >= 0 ? await readSelectionManifest(rest[selectionIndex + 1]!) : undefined;
    const candidate = await proposeConfirmation(design, filePath, 'open-pencil-cli@0.16.0', selection);
    await writeConfirmation(outputPath, candidate);
    return JSON.stringify({ status: candidate.status, output: outputPath, screens: candidate.flow.screens.length, questions: candidate.questions.length, transitions: candidate.flow.transitions.length, candidateHash: candidate.candidateHash }, null, 2);
  }
  if (command === 'save-flow-decisions' && filePath) {
    const decisionsIndex = rest.indexOf('--decisions');
    const outputIndex = rest.indexOf('--output');
    const decisionsPath = decisionsIndex >= 0 ? rest[decisionsIndex + 1] : undefined;
    const outputPath = outputIndex >= 0 ? rest[outputIndex + 1] : undefined;
    if (!decisionsPath || !outputPath) throw new Error('Usage: save-flow-decisions <candidate.json> --decisions <answers.json> --output <draft.json>');
    const candidate = await readConfirmation(filePath);
    const decisions = JSON.parse(await readFile(decisionsPath, 'utf8')) as FlowDecision[];
    const draft = saveDecisions(candidate, decisions);
    await writeConfirmation(outputPath, draft);
    return JSON.stringify({ status: draft.status, output: outputPath, revision: draft.revision, parentRevision: draft.parentRevision, blockingQuestionIds: validateConfirmationEnvelope(draft).blockingQuestionIds }, null, 2);
  }
  if (command === 'confirm-flow' && filePath) {
    const outputIndex = rest.indexOf('--output');
    const outputPath = outputIndex >= 0 ? rest[outputIndex + 1] : undefined;
    if (!outputPath) throw new Error('Usage: confirm-flow <candidate.json> --output <confirmed.json>');
    const confirmed = confirmEnvelope(await readConfirmation(filePath));
    await writeConfirmation(outputPath, confirmed);
    return JSON.stringify({ status: confirmed.status, output: outputPath, revision: confirmed.revision, parentRevision: confirmed.parentRevision }, null, 2);
  }
  if (command === 'validate-flow' && filePath) {
    const envelope = await readConfirmation(filePath);
    const result = validateConfirmationEnvelope(envelope);
    const selectionIndex = rest.indexOf('--selection');
    const currentSelection = selectionIndex >= 0 ? await readSelectionManifest(rest[selectionIndex + 1]!) : undefined;
    if (envelope.status === 'confirmed' && result.valid) compileConfirmedFlow(envelope, currentSelection);
    return JSON.stringify({ ...result, status: envelope.status, revision: envelope.revision, candidateHash: envelope.candidateHash }, null, 2);
  }
  if (command === 'verify' && filePath) {
    const candidatePath = rest[0];
    if (!candidatePath) throw new Error('Usage: verify <reference.png> <candidate.png> [--threshold <ratio>]');
    const thresholdIndex = rest.indexOf('--threshold');
    const thresholdValue = thresholdIndex >= 0 ? rest[thresholdIndex + 1] : undefined;
    const diffIndex = rest.indexOf('--diff');
    const diffPath = diffIndex >= 0 ? rest[diffIndex + 1] : undefined;
    const threshold = thresholdValue === undefined ? undefined : Number(thresholdValue);
    if (thresholdValue !== undefined && (!Number.isFinite(threshold) || threshold < 0 || threshold > 1)) {
      throw new Error('Screenshot threshold must be a number between 0 and 1');
    }
    return JSON.stringify(await verifyScreenshot(filePath, candidatePath, threshold, diffPath), null, 2);
  }
  if (command === 'validate' && filePath) {
    const readJson = async (name: string) => JSON.parse(await readFile(join(filePath, name), 'utf8'));
    const integrationProfile = await readOptionalIntegrationProfile(filePath);
    const designDocument = await readJson('design.json');
    const flowDocument = await readJson('flow.json');
    validateDesignPackage({
      design: designDocument.document,
      flow: flowDocument.flow,
      assets: await readJson('assets.json'),
      layoutContracts: await readJson('layout-contracts.json'),
      screenContracts: (await readJson('screen-contracts.json')).screenContracts,
      audit: await readJson('audit.json'),
      provenance: await readJson('provenance.json'),
      screenDiscovery: await readJson('screen-discovery.json'),
      designEvidence: await readJson('design-evidence.json'),
      nativePatternMapping: await readJson('native-patterns.json'),
      runtimeRoutePlan: await readJson('runtime-route-plan.json'),
      ...(integrationProfile === undefined ? {} : { integrationProfile }),
    });
    return JSON.stringify({ status: 'pass', packageDirectory: filePath }, null, 2);
  }
  if (command === 'report' && filePath) {
    const readJson = async (name: string) => JSON.parse(await readFile(join(filePath, name), 'utf8'));
    const audit = await readJson('audit.json');
    const flow = (await readJson('flow.json')).flow;
    const design = (await readJson('design.json')).document;
    const assets = await readJson('assets.json');
    const coverage = buildCoverageReport({
      design,
      flow,
      assetNodeIds: assets.assets?.map((asset: { sourceNodeId?: string }) => asset.sourceNodeId).filter((id: string | undefined): id is string => Boolean(id)),
    });
    return JSON.stringify({
      packageDirectory: filePath,
      documents: { design: true, flow: true, assets: true, layoutContracts: true, audit: true, provenance: true },
      designNodes: design.nodes?.length ?? 0,
      screens: flow.screens?.length ?? 0,
      transitions: flow.transitions?.length ?? 0,
      runtimeRoutePlan: buildRuntimeRoutePlan(flow),
      coverage,
      gates: {
        structural: coverage.audit.every((entry) => !entry.blocking) ? 'pass' : 'blocked',
        runtime: 'pending',
        visual: 'pending',
      },
      audit: {
        entries: audit.entries?.length ?? 0,
        blocking: audit.entries?.filter((entry: { blocking?: boolean }) => entry.blocking).length ?? 0,
      },
    }, null, 2);
  }
  if (command === 'preflight' && filePath) {
    const outputIndex = rest.indexOf('--output');
    const outputDirectory = outputIndex >= 0 ? rest[outputIndex + 1] : undefined;
    if (!outputDirectory) throw new Error('Usage: preflight <file.fig> --output <directory> [--flow <spec.md|spec.json|spec.yaml>]');
    const scope = await resolveInspectOptions(adapter, filePath, rest);
    const design = await adapter.inspect(filePath, { ...scope, hydrate: true, hydrateDepth: DEFAULT_HYDRATE_DEPTH, hydrateRootCount: 1, hydrateStrategy: 'tree' });
    if (design.diagnostics.some((item) => item.severity === 'error')) {
      throw new Error(`Design diagnostics prevent preflight: ${design.diagnostics.filter((item) => item.severity === 'error').map((item) => item.message).join('; ')}`);
    }
    let flow = inferFlowFromDesign(design, filePath);
    const confirmedFlowIndex = rest.indexOf('--confirmed-flow');
    const confirmedFlowPath = confirmedFlowIndex >= 0 ? rest[confirmedFlowIndex + 1] : undefined;
    const selectionIndex = rest.indexOf('--selection');
    const currentSelection = selectionIndex >= 0 ? await readSelectionManifest(rest[selectionIndex + 1]!) : undefined;
    if (confirmedFlowPath) {
      const confirmed = await readConfirmation(confirmedFlowPath);
      flow = compileConfirmedFlow(confirmed, currentSelection);
    }
    const flowIndex = rest.indexOf('--flow');
    const flowPath = flowIndex >= 0 ? rest[flowIndex + 1] : undefined;
    if (flowPath && !confirmedFlowPath) {
      const flowText = await readFile(flowPath, 'utf8');
      const extension = extname(flowPath).toLowerCase();
      const flowSpec = extension === '.md' || extension === '.markdown'
        ? loadMarkdownFlow(flowText, flowPath)
        : loadStructuredFlow(flowText, flowPath, extension === '.json' ? 'json' : 'yaml');
      flow = mergeFlowSources(flow, flowSpec, flowPath);
      if (flow.conflicts.length > 0) throw new Error(`Flow conflicts prevent preflight: ${flow.conflicts.map((item) => item.message).join('; ')}`);
    }
    flow = resolveFlowScope(design, flow, filePath);
    const screenContractsIndex = rest.indexOf('--screen-contracts');
    const screenContractsPath = screenContractsIndex >= 0 ? rest[screenContractsIndex + 1] : undefined;
    if (screenContractsIndex >= 0 && !screenContractsPath) throw new Error('Usage: preflight <file.fig> --output <directory> [--screen-contracts <contracts.json>]');
    const rawScreenContracts = screenContractsPath
      ? JSON.parse(await readFile(screenContractsPath, 'utf8'))
      : [];
    const screenContractList = Array.isArray(rawScreenContracts)
      ? rawScreenContracts as ScreenContract[]
      : rawScreenContracts && typeof rawScreenContracts === 'object' && Array.isArray((rawScreenContracts as { screenContracts?: unknown }).screenContracts)
        ? (rawScreenContracts as { screenContracts: ScreenContract[] }).screenContracts
        : [];
    const screenContracts = confirmedFlowPath
      ? bindScreenContractsToFlow(screenContractList, flow)
      : screenContractList;
    const integrationIndex = rest.indexOf('--integration');
    const integrationPath = integrationIndex >= 0 ? rest[integrationIndex + 1] : undefined;
    if (integrationIndex >= 0 && !integrationPath) throw new Error('Usage: preflight <file.fig> --integration <profile.json>');
    const integrationProfile = integrationPath
      ? validateExistingIOSIntegrationProfile(JSON.parse(await readFile(integrationPath, 'utf8')))
      : undefined;
    const coverage = buildCoverageReport({
      design,
      flow,
      assetNodeIds: design.assets.map((asset) => asset.sourceNodeId).filter((id): id is string => Boolean(id)),
    });
    const extractedLayout = extractLayoutContracts(design);
    const designNodeProvenance = new Map<string, typeof design.nodes[number]['provenance']>();
    const indexProvenance = (nodes: typeof design.nodes): void => {
      for (const node of nodes) {
        designNodeProvenance.set(node.id, node.provenance);
        indexProvenance(node.children);
      }
    };
    indexProvenance(design.nodes);
    const layoutContracts = {
      contracts: extractedLayout.nodes.map((node) => ({
        nodeId: node.id,
        ...(node.parentId ? { parentNodeId: node.parentId } : {}),
        relation: node.mode === 'flow' ? 'flow' as const : node.mode,
        ...(node.frame ? { frame: node.frame } : {}),
        provenance: designNodeProvenance.get(node.id) ?? [],
      })),
    };
    const scopeSource = selectionProvenance(filePath, scope);
    const discoveryReport = discoverScreens(design, filePath, scope.rootNodeIds ? 'selected-subtree' : 'page');
    const evidenceScreenIds = flow.screens.map((screen) => screen.designNodeId).filter((id): id is string => Boolean(id));
    const evidenceReport = buildDesignEvidence(
      design,
      evidenceScreenIds.length > 0 ? evidenceScreenIds : discoveryReport.screens.map((screen) => screen.nodeId),
      filePath,
    );
    const nativePatternMapping = buildNativePatternMapping(
      design,
      evidenceScreenIds.length > 0 ? evidenceScreenIds : discoveryReport.screens.map((screen) => screen.nodeId),
      filePath,
    );
    await writeDesignPackage(outputDirectory, {
      design,
      flow,
      assets: { assets: design.assets },
      layoutContracts,
      screenContracts,
      audit: {
        entries: [
          ...design.diagnostics.map((item) => ({
          severity: item.severity,
          source: { reference: filePath, ...(item.path ? { nodeId: item.path } : {}) },
          pipelineStage: 'Normalize' as const,
          reason: item.message,
          affectedOutput: 'design.json',
          blocking: item.severity === 'error',
          })),
          ...extractedLayout.diagnostics.map((item) => ({
            severity: item.severity,
            source: { reference: filePath, ...(item.path ? { nodeId: item.path } : {}) },
            pipelineStage: 'Analyze' as const,
            reason: item.message,
            affectedOutput: 'layout-contracts.json',
            blocking: item.severity === 'error',
          })),
          ...coverage.audit,
        ],
      },
      provenance: {
        entries: [
          ...design.provenance.map((source) => ({ path: 'design', source })),
          ...(scopeSource ? [{ path: 'selection', source: scopeSource }] : []),
        ],
      },
      screenDiscovery: discoveryReport,
      designEvidence: evidenceReport,
      nativePatternMapping,
      ...(integrationProfile ? { integrationProfile } : {}),
    });
    return JSON.stringify({ outputDirectory, files: ['design.json', 'flow.json', 'assets.json', 'layout-contracts.json', 'screen-contracts.json', 'audit.json', 'provenance.json', 'screen-discovery.json', 'design-evidence.json', 'native-patterns.json', 'runtime-route-plan.json'] }, null, 2);
  }
  if (command === 'generate' && filePath) {
    const outputIndex = rest.indexOf('--output');
    const outputDirectory = outputIndex >= 0 ? rest[outputIndex + 1] : undefined;
    if (!outputDirectory) throw new Error('Usage: generate <file.fig> --output <directory> [--feature <name>]');
    const featureIndex = rest.indexOf('--feature');
    const featureName = featureIndex >= 0 ? rest[featureIndex + 1] : basename(filePath, extname(filePath));
    if (!featureName) throw new Error('Feature name must not be empty');
    const platformIndex = rest.indexOf('--platform');
    const platform = (platformIndex >= 0 ? rest[platformIndex + 1] : 'both') as IOSPlatform;
    if (!['swiftui', 'uikit', 'both'].includes(platform)) throw new Error('Platform must be swiftui, uikit, or both');
    const packageMode = rest.includes('--package');
    const screenContractIndex = rest.indexOf('--screen-contract');
    const screenContractPath = screenContractIndex >= 0 ? rest[screenContractIndex + 1] : undefined;
    if (screenContractIndex >= 0 && !screenContractPath) throw new Error('Usage: generate <file.fig> --output <directory> [--screen-contract <contract.json>]');
    const screenIdIndex = rest.indexOf('--screen-id');
    const screenId = screenIdIndex >= 0 ? rest[screenIdIndex + 1] : undefined;
    const rawScreenContract = screenContractPath
      ? JSON.parse(await readFile(screenContractPath, 'utf8')) as unknown
      : undefined;
    const screenContractList = Array.isArray(rawScreenContract)
      ? rawScreenContract
      : rawScreenContract && typeof rawScreenContract === 'object' && Array.isArray((rawScreenContract as { screenContracts?: unknown }).screenContracts)
        ? (rawScreenContract as { screenContracts: unknown[] }).screenContracts
        : undefined;
    let screenContract = screenContractList
      ? screenContractList.find((contract) => typeof contract === 'object' && contract !== null && (contract as { id?: unknown }).id === screenId)
      : rawScreenContract;
    if (screenContractList && (!screenId || !screenContract)) throw new Error('Usage: generate with an array screen contract requires --screen-id <id>');
    const integrationIndex = rest.indexOf('--integration');
    const integrationPath = integrationIndex >= 0 ? rest[integrationIndex + 1] : undefined;
    if (integrationIndex >= 0 && !integrationPath) throw new Error('Usage: generate <file.fig> --integration <profile.json>');
    const integrationProfile = integrationPath
      ? validateExistingIOSIntegrationProfile(JSON.parse(await readFile(integrationPath, 'utf8')))
      : undefined;
    if (integrationProfile) assertExistingIOSIntegrationPlatform(integrationProfile, platform);
    const scope = await resolveInspectOptions(adapter, filePath, rest);
    const design = await adapter.inspect(filePath, {
      ...scope,
      hydrate: true,
      // The selected root is nested under the page/app hierarchy. Keep the
      // bounded walk deep enough to include render-critical descendants such
      // as quantity-control strokes without making hydration unbounded.
      hydrateDepth: DEFAULT_HYDRATE_DEPTH + 12,
      hydrateRootCount: 1,
      // Generation always needs the selected hierarchy. Node-only hydration
      // returns child counts for scoped roots and silently drops their UI.
      hydrateStrategy: 'tree' as const,
    });
    let flow = inferFlowFromDesign(design, filePath);
    const confirmedFlowIndex = rest.indexOf('--confirmed-flow');
    const confirmedFlowPath = confirmedFlowIndex >= 0 ? rest[confirmedFlowIndex + 1] : undefined;
    const selectionIndex = rest.indexOf('--selection');
    const currentSelection = selectionIndex >= 0 ? await readSelectionManifest(rest[selectionIndex + 1]!) : undefined;
    if (confirmedFlowPath) {
      const confirmed = await readConfirmation(confirmedFlowPath);
      flow = compileConfirmedFlow(confirmed, currentSelection);
    }
    const flowIndex = rest.indexOf('--flow');
    const flowPath = flowIndex >= 0 ? rest[flowIndex + 1] : undefined;
    if (flowPath && !confirmedFlowPath) {
      const flowText = await readFile(flowPath, 'utf8');
      const extension = extname(flowPath).toLowerCase();
      const flowSpec = extension === '.md' || extension === '.markdown'
        ? loadMarkdownFlow(flowText, flowPath)
        : loadStructuredFlow(flowText, flowPath, extension === '.json' ? 'json' : 'yaml');
      flow = mergeFlowSources(flow, flowSpec, flowPath);
      if (flow.conflicts.length > 0) {
        throw new Error(`Flow conflicts prevent code generation: ${flow.conflicts.map((item) => item.message).join('; ')}`);
      }
    }
    flow = resolveFlowScope(design, flow, filePath);
    if (confirmedFlowPath && screenContract) {
      screenContract = bindScreenContractsToFlow([screenContract as ScreenContract], flow)[0];
    }
    const generationScreenIds = screenContract
      ? [screenContract.designNodeId]
      : flow.screens.map((screen) => screen.designNodeId).filter((id): id is string => Boolean(id));
    const generationDiscovery = discoverScreens(design, filePath, scope.rootNodeIds ? 'selected-subtree' : 'page');
    const nativePatternMapping = buildNativePatternMapping(
      design,
      generationScreenIds.length > 0 ? generationScreenIds : generationDiscovery.screens.map((screen) => screen.nodeId),
      filePath,
      new Set(screenContract?.assets.map((asset: { nodeId: string }) => asset.nodeId) ?? []),
    );
    const navigationScaffold = buildNavigationScaffold(flow);
    const baseCodegenInput = { featureName, design, flow, nativePatternMapping, navigationScaffold, ...(screenContract ? { screenContract } : {}), ...(integrationProfile ? { integrationProfile } : {}) };
    const packageSourceDirectories = packageMode ? iosPackageSourceDirectories(baseCodegenInput, outputDirectory, platform) : [outputDirectory];
    const screenAssetNodeIds = screenContract
      ? new Set(screenContract.assets.map((asset: { nodeId: string }) => asset.nodeId))
      : undefined;
    const exportedAssetSets = await Promise.all(packageSourceDirectories.map((directory) => exportDesignAssets(
      design,
      filePath,
      directory,
      adapter,
      { nodeIds: screenAssetNodeIds },
    )));
    const exportedAssets = exportedAssetSets[0] ?? [];
    const codegenInput = {
      ...baseCodegenInput,
      resourceBundle: packageMode ? 'module' as const : 'main' as const,
      assetBindings: exportedAssets.map((asset) => ({
        sourceNodeId: asset.nodeId,
        resourceName: asset.path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? asset.sourceName,
      })),
    };
    const generatedFiles = packageMode
      ? await generateIOSPackageFiles(codegenInput, outputDirectory, platform)
      : await generateIOSFiles(codegenInput, outputDirectory, platform);
    const packageManifest = packageMode ? await writeIOSPackageManifest(codegenInput, outputDirectory, platform) : undefined;
    const manifestAssets = packageMode
      ? exportedAssets.map((asset) => ({
        ...asset,
        path: `Sources/${swiftTypeName(featureName)}${platform === 'uikit' ? 'UIKit' : 'SwiftUI'}/${asset.path}`,
        ...(asset.assetCatalogPath ? { assetCatalogPath: `Sources/${swiftTypeName(featureName)}${platform === 'uikit' ? 'UIKit' : 'SwiftUI'}/${asset.assetCatalogPath}` } : {}),
      }))
      : exportedAssets;
    await writeAssetManifest(outputDirectory, manifestAssets);
    if (packageMode) {
      const screenManifest = buildScreenAcceptanceManifest(featureName, design, flow);
      await writeFile(join(outputDirectory, 'screen-acceptance.json'), `${JSON.stringify(screenManifest, null, 2)}\n`, 'utf8');
    }
    const assets = manifestAssets.map((asset) => asset.path);
    const files = packageMode ? [...generatedFiles, packageManifest!] : generatedFiles;
    return JSON.stringify({
      featureName, outputDirectory, package: packageMode, platform, flowPath, screens: flow.screens.length,
      transitions: flow.transitions.length, diagnostics: flow.diagnostics, assets,
      files: [...files.map((file) => file.path), ...(packageMode ? ['screen-acceptance.json'] : [])],
    }, null, 2);
  }
  throw new Error(CLI_USAGE);
}

if (process.argv[1]?.endsWith('/main.ts')) {
  runCli(process.argv.slice(2)).then((output) => console.log(output)).catch((error) => {
    console.error(formatCliError(error));
    process.exitCode = cliExitCode(error);
  });
}
