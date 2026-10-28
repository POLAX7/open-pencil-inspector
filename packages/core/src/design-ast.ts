import type { Diagnostic, SourceProvenance } from './diagnostics.ts';

export type DesignNodeType =
  | 'DOCUMENT'
  | 'PAGE'
  | 'SECTION'
  | 'FRAME'
  | 'GROUP'
  | 'COMPONENT'
  | 'INSTANCE'
  | 'TEXT'
  | 'VECTOR'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'IMAGE'
  | 'UNKNOWN';

export interface DesignLayout {
  x?: number;
  y?: number;
  direction?: 'ROW' | 'COL';
  gap?: number;
  padding?: [number, number, number, number];
  width?: number;
  height?: number;
  alignment?: string;
  sizing?: string;
}

export interface DesignStyle {
  fill?: string;
  stroke?: string;
  radius?: number | [number, number, number, number];
  opacity?: number;
  shadow?: string;
}

export interface DesignText {
  content: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  lineHeight?: number;
  color?: string;
  alignment?: string;
}

export interface DesignNode {
  id: string;
  name: string;
  type: DesignNodeType;
  layout?: DesignLayout;
  style?: DesignStyle;
  text?: DesignText;
  component?: {
    key?: string;
    properties?: Record<string, string | boolean | number>;
    variant?: string;
  };
  assetRef?: string;
  children: DesignNode[];
  unsupportedProperties: string[];
  provenance: SourceProvenance[];
}

export interface DesignToken {
  name: string;
  value: string | number;
  category: 'color' | 'typography' | 'spacing' | 'radius' | 'other';
  provenance: SourceProvenance[];
}

export interface DesignAsset {
  id: string;
  name: string;
  kind: 'svg' | 'png' | 'jpg' | 'webp' | 'font' | 'unknown';
  path?: string;
  sourceNodeId?: string;
  provenance: SourceProvenance[];
}

export interface DesignDocument {
  id: string;
  name: string;
  nodes: DesignNode[];
  tokens: DesignToken[];
  assets: DesignAsset[];
  diagnostics: Diagnostic[];
  provenance: SourceProvenance[];
}

const NODE_TYPES = new Set<DesignNodeType>([
  'DOCUMENT', 'PAGE', 'SECTION', 'FRAME', 'GROUP', 'COMPONENT', 'INSTANCE', 'TEXT',
  'VECTOR', 'RECTANGLE', 'ELLIPSE', 'IMAGE', 'UNKNOWN',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`Design ${field} must be a non-empty string`);
  }
  return value;
}

function normalizeNode(input: unknown, path: string): DesignNode {
  if (!isRecord(input)) throw new TypeError(`Design node at ${path} must be an object`);
  const typeValue = typeof input.type === 'string' && NODE_TYPES.has(input.type as DesignNodeType)
    ? input.type as DesignNodeType
    : 'UNKNOWN';
  const children = input.children === undefined ? [] : input.children;
  if (!Array.isArray(children)) throw new TypeError(`Design node children at ${path} must be an array`);
  const unsupported = Array.isArray(input.unsupportedProperties)
    ? input.unsupportedProperties.filter((value): value is string => typeof value === 'string')
    : [];
  if (typeValue === 'UNKNOWN' && typeof input.type === 'string') unsupported.push(`type:${input.type}`);
  return {
    id: requiredString(input.id, `${path}.id`),
    name: typeof input.name === 'string' ? input.name : '',
    type: typeValue,
    layout: isRecord(input.layout) ? input.layout as DesignLayout : undefined,
    style: isRecord(input.style) ? input.style as DesignStyle : undefined,
    text: isRecord(input.text) ? input.text as DesignText : undefined,
    component: isRecord(input.component) ? input.component as DesignNode['component'] : undefined,
    assetRef: typeof input.assetRef === 'string' ? input.assetRef : undefined,
    children: children.map((child, index) => normalizeNode(child, `${path}.children[${index}]`)),
    unsupportedProperties: unsupported,
    provenance: Array.isArray(input.provenance) ? input.provenance as SourceProvenance[] : [],
  };
}

export function normalizeDesignDocument(input: unknown): DesignDocument {
  if (!isRecord(input)) throw new TypeError('Design document must be an object');
  if (!Array.isArray(input.nodes)) throw new TypeError('Design document nodes must be an array');
  return {
    id: requiredString(input.id, 'document id'),
    name: typeof input.name === 'string' ? input.name : '',
    nodes: input.nodes.map((node, index) => normalizeNode(node, `nodes[${index}]`)),
    tokens: Array.isArray(input.tokens) ? input.tokens as DesignToken[] : [],
    assets: Array.isArray(input.assets) ? input.assets as DesignAsset[] : [],
    diagnostics: Array.isArray(input.diagnostics) ? input.diagnostics as Diagnostic[] : [],
    provenance: Array.isArray(input.provenance) ? input.provenance as SourceProvenance[] : [],
  };
}
