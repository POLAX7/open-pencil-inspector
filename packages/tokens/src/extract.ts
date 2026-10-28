import type { DesignDocument, DesignToken } from '../../core/src/design-ast.ts';

export interface SemanticToken extends DesignToken { name: string }
export interface TokenBinding { tokenName: string; host: string; reference: string }
export interface SemanticTokenDocument { tokens: SemanticToken[]; bindings: TokenBinding[] }

function semanticName(name: string): string {
  return name.trim().replace(/[\\/]+/g, '.').replace(/\s+/g, '-').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
}

export function extractSemanticTokens(document: DesignDocument, options?: { host?: string; prefix?: string }): SemanticTokenDocument {
  const tokens = document.tokens.map((token) => ({ ...token, name: semanticName(token.name) }));
  const bindings = options?.host
    ? tokens.map((token) => ({ tokenName: token.name, host: options.host!, reference: `${options.prefix ? `${options.prefix}.` : ''}${token.name}` }))
    : [];
  return { tokens, bindings };
}
