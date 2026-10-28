import type { DesignNode, DesignNodeType } from './design-ast.ts';
import { diagnostic, type Diagnostic, type SourceProvenance } from './diagnostics.ts';

export interface ExternalNodeResult {
  node: DesignNode;
  diagnostics: Diagnostic[];
}

const TYPE_MAP: Record<string, DesignNodeType> = {
  ROUNDED_RECTANGLE: 'RECTANGLE',
  BOOLEAN_OPERATION: 'VECTOR',
  LINE: 'VECTOR',
  STAR: 'VECTOR',
};

const NODE_TYPES = new Set<DesignNodeType>([
  'DOCUMENT', 'PAGE', 'SECTION', 'FRAME', 'GROUP', 'COMPONENT', 'INSTANCE', 'TEXT',
  'VECTOR', 'RECTANGLE', 'ELLIPSE', 'IMAGE', 'UNKNOWN',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function colorToHex(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  const channels = ['r', 'g', 'b'].map((channel) => value[channel]);
  if (!channels.every((channel) => typeof channel === 'number')) return undefined;
  const alpha = typeof value.a === 'number' ? value.a : 1;
  const hex = channels.map((channel) => Math.round(Number(channel) * 255).toString(16).padStart(2, '0')).join('');
  return alpha < 1 ? `#${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}` : `#${hex}`;
}

function firstVisibleColor(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return undefined;
  const fill = value.find((item) => isRecord(item) && item.visible !== false && (item.type === undefined || item.type === 'SOLID'));
  return isRecord(fill) ? colorToHex(fill.color) ?? (typeof fill.color === 'string' ? fill.color : undefined) : undefined;
}

function firstVisibleImageHash(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  const fill = value.find((item) => isRecord(item) && item.visible !== false && item.type === 'IMAGE');
  return isRecord(fill) ? string(fill.imageHash) : undefined;
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function string(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function properties(value: unknown): Record<string, string | boolean | number> | undefined {
  if (!isRecord(value)) return undefined;
  const result: Record<string, string | boolean | number> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string' || typeof item === 'boolean' || typeof item === 'number') result[key] = item;
  }
  return result;
}

function normalizeType(rawType: unknown): { type: DesignNodeType; rawType?: string } {
  const raw = typeof rawType === 'string' ? rawType : undefined;
  const mapped = raw ? (TYPE_MAP[raw] ?? raw) : 'UNKNOWN';
  return { type: NODE_TYPES.has(mapped as DesignNodeType) ? mapped as DesignNodeType : 'UNKNOWN', rawType: raw };
}

export function normalizeExternalNode(input: unknown, provenance: SourceProvenance[]): ExternalNodeResult {
  if (!isRecord(input)) throw new TypeError('External design node must be an object');
  const id = string(input.id) ?? '';
  const { type, rawType } = normalizeType(input.type);
  const diagnostics: Diagnostic[] = [];
  const unsupportedProperties = Array.isArray(input.unsupportedProperties)
    ? input.unsupportedProperties.filter((item): item is string => typeof item === 'string')
    : [];
  if (type === 'UNKNOWN' && rawType) {
    unsupportedProperties.push(`type:${rawType}`);
    diagnostics.push(diagnostic('UNSUPPORTED_NODE_TYPE', 'warning', `Unsupported node type: ${rawType}`, { path: id, provenance }));
  }
  if (type === 'VECTOR' || rawType === 'INSTANCE') {
    const renderType = rawType === 'INSTANCE' ? 'instance' : 'vector';
    unsupportedProperties.push(`render:${renderType}`);
    diagnostics.push(diagnostic('UNSUPPORTED_NODE_RENDER', 'warning', `Native rendering requires an exported asset for ${rawType ?? type}`, { path: id, provenance }));
  }
  for (const property of unsupportedProperties.filter((item) => !item.startsWith('render:') && !item.startsWith('type:'))) {
    diagnostics.push(diagnostic('UNSUPPORTED_NODE_PROPERTY', 'warning', `Unsupported node property: ${property}`, { path: id, provenance }));
  }

  const width = number(input.width) ?? number(input.w);
  const height = number(input.height) ?? number(input.h);
  const layout: Record<string, unknown> = {};
  for (const [key, value] of [['x', input.x], ['y', input.y], ['width', width], ['height', height]] as const) {
    if (typeof value === 'number') layout[key] = value;
  }
  if (input.layoutMode === 'HORIZONTAL') layout.direction = 'ROW';
  if (input.layoutMode === 'VERTICAL') layout.direction = 'COL';
  if (typeof input.itemSpacing === 'number') layout.gap = input.itemSpacing;
  const padding = [input.paddingTop, input.paddingRight, input.paddingBottom, input.paddingLeft];
  if (padding.every((item) => typeof item === 'number')) layout.padding = padding as [number, number, number, number];
  const alignment = string(input.primaryAxisAlignItems) ?? string(input.counterAxisAlignItems) ?? string(input.alignment);
  const sizing = string(input.primaryAxisSizingMode) ?? string(input.counterAxisSizingMode) ?? string(input.sizing);
  if (alignment) layout.alignment = alignment;
  if (sizing) layout.sizing = sizing;
  if (['FRAME', 'COMPONENT', 'INSTANCE', 'IMAGE'].includes(type) && (width === undefined || height === undefined)) {
    diagnostics.push(diagnostic('MISSING_NODE_FRAME', 'warning', 'Node has no complete width/height frame', { path: id, provenance }));
  }

  const fill = firstVisibleColor(input.fills) ?? string(input.fill) ?? (isRecord(input.style) ? string(input.style.fill) : undefined);
  const stroke = firstVisibleColor(input.strokes) ?? string(input.stroke) ?? (isRecord(input.style) ? string(input.style.stroke) : undefined);
  const style = {
    ...(fill ? { fill } : {}),
    ...(stroke ? { stroke } : {}),
    ...(number(input.cornerRadius) !== undefined ? { radius: number(input.cornerRadius) } : {}),
    ...(number(input.opacity) !== undefined && input.opacity !== 1 ? { opacity: number(input.opacity) } : {}),
  };

  const textContent = string(input.characters) ?? string(input.text) ?? (type === 'TEXT' ? string(input.name) : undefined);
  const rawStyle = isRecord(input.style) ? input.style : {};
  const text = textContent === undefined ? undefined : {
    content: textContent,
    ...(string(input.fontFamily) ?? string(rawStyle.fontFamily) ? { fontFamily: string(input.fontFamily) ?? string(rawStyle.fontFamily) } : {}),
    ...(number(input.fontSize) ?? number(rawStyle.fontSize) ? { fontSize: number(input.fontSize) ?? number(rawStyle.fontSize) } : {}),
    ...(typeof input.fontWeight === 'number' || typeof input.fontWeight === 'string' ? { fontWeight: input.fontWeight } : {}),
    ...(number(input.lineHeight) ?? number(rawStyle.lineHeight) ? { lineHeight: number(input.lineHeight) ?? number(rawStyle.lineHeight) } : {}),
    ...(fill ? { color: fill } : {}),
    ...(string(input.textAlignHorizontal) ?? string(input.alignment) ? { alignment: string(input.textAlignHorizontal) ?? string(input.alignment) } : {}),
  };

  const rawComponent = isRecord(input.component) ? input.component : {};
  const componentKey = string(input.componentKey) ?? string(rawComponent.key);
  const componentProperties = properties(input.componentProperties) ?? properties(rawComponent.properties);
  const variant = string(input.variant) ?? string(rawComponent.variant);
  const component = componentKey || componentProperties || variant
    ? { ...(componentKey ? { key: componentKey } : {}), ...(componentProperties ? { properties: componentProperties } : {}), ...(variant ? { variant } : {}) }
    : undefined;
  const children = Array.isArray(input.children) ? input.children : [];
  if (typeof input.children === 'number') {
    unsupportedProperties.push(`children:count:${input.children}`);
    diagnostics.push(diagnostic('CHILDREN_NOT_HYDRATED', 'warning', `Node reports ${input.children} children but did not provide their nodes`, { path: id, provenance }));
  }
  const childResults = children.map((child) => normalizeExternalNode(child, provenance));
  return {
    node: {
      id,
      name: string(input.name) ?? '',
      type,
      ...(Object.keys(layout).length ? { layout: layout as DesignNode['layout'] } : {}),
      ...(Object.keys(style).length ? { style } : {}),
      ...(text ? { text } : {}),
      ...(component ? { component } : {}),
      ...((string(input.assetRef) ?? string(input.imageRef) ?? firstVisibleImageHash(input.fills)) ? { assetRef: string(input.assetRef) ?? string(input.imageRef) ?? firstVisibleImageHash(input.fills) } : {}),
      children: childResults.map((result) => result.node),
      unsupportedProperties,
      provenance,
    },
    diagnostics: [...diagnostics, ...childResults.flatMap((result) => result.diagnostics)],
  };
}
