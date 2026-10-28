import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSwiftUIView as generateSwiftUIViewImpl } from '../src/generator.ts';
import { generateFoodAppCompatibilityView } from '../src/compatibility.ts';

function generateSwiftUIView(input: any) {
  return input.featureName === 'FoodApp' ? generateFoodAppCompatibilityView(input) : generateSwiftUIViewImpl(input);
}

test('SwiftUI generator emits state-driven View and ViewModel', () => {
  const result = generateSwiftUIView({ featureName: 'login', design: { id: 'd', name: 'd', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] }, flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] } });
  assert.match(result.files[0]?.contents ?? '', /struct LoginView: View/);
  assert.match(result.files[0]?.contents ?? '', /ProgressView/);
  assert.match(result.files[0]?.contents ?? '', /ContentUnavailableView/);
});

test('SwiftUI generator exposes an embedded navigation mode for host-owned stacks', () => {
  const result = generateSwiftUIView({ featureName: 'login', design: { id: 'd', name: 'd', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] }, flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] } });
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /enum LoginNavigationMode/);
  assert.match(source, /navigationMode: LoginNavigationMode = \.standalone/);
  assert.match(source, /case \.embedded:/);
  assert.match(source, /case \.standalone:/);
});

test('SwiftUI generated View is main-actor isolated when its coordinator default is main-actor isolated', () => {
  const result = generateSwiftUIView({ featureName: 'login', design: { id: 'd', name: 'd', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] }, flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] } });
  assert.match(result.files[0]?.contents ?? '', /@MainActor public struct LoginView: View/);
});

test('SwiftUI generic backend consumes UI IR patterns for native controls, assets, and accessibility', () => {
  const result = generateSwiftUIView({
    featureName: 'profile',
    design: { id: 'd', name: 'Profile', nodes: [{ id: 'screen', name: 'Profile', type: 'FRAME', layout: { width: 320, height: 640 }, children: [
      { id: 'title', name: 'Title', type: 'TEXT', text: { content: 'Profile' }, children: [], unsupportedProperties: [], provenance: [] },
      { id: 'avatar', name: 'Avatar', type: 'IMAGE', assetRef: 'avatar.svg', children: [], unsupportedProperties: [], provenance: [] },
      { id: 'save', name: 'Save', type: 'RECTANGLE', children: [], unsupportedProperties: [], provenance: [] },
    ], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    assetBindings: [{ sourceNodeId: 'avatar', resourceName: 'avatar' }],
    flow: { version: '1.0', screens: [{ id: 'profile', provenance: [] }], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /Text\("Profile"\)/);
  assert.match(source, /Image\("avatar", bundle: Bundle\.module\)/);
  assert.doesNotMatch(source, /^import UIKit$/m);
  assert.match(source, /Button\("Save"/);
  assert.match(source, /accessibilityIdentifier\("save"\)/);
  assert.match(source, /ViewModelProtocol/);
});

test('SwiftUI generic backend renders evidence-backed semantic icons without asset refs', () => {
  const result = generateSwiftUIView({
    featureName: 'details',
    design: { id: 'd', name: 'Details', nodes: [{ id: 'screen', name: 'Details', type: 'FRAME', layout: { width: 360, height: 800 }, children: [
      { id: 'back', name: 'icon/navigation/arrow_back_ios_24px', type: 'VECTOR', layout: { x: 7, y: 5, width: 9, height: 15 }, children: [], unsupportedProperties: [], provenance: [] },
      { id: 'star', name: 'Star 1', type: 'VECTOR', layout: { x: 0, y: 0, width: 16, height: 16 }, children: [], style: { fill: '#eb0029' }, unsupportedProperties: [], provenance: [] },
    ], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /Image\(systemName: "chevron\.left"\)/);
  assert.match(source, /Image\(systemName: "star\.fill"\)/);
});

test('SwiftUI non-package output can load assets from the application bundle', () => {
  const result = generateSwiftUIView({
    featureName: 'profile', resourceBundle: 'main',
    design: { id: 'd', name: 'Profile', nodes: [{ id: 'screen', name: 'Profile', type: 'FRAME', layout: { width: 320, height: 640 }, children: [{ id: 'avatar', name: 'Avatar', type: 'IMAGE', children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    assetBindings: [{ sourceNodeId: 'avatar', resourceName: 'avatar' }],
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  assert.match(result.files[0]?.contents ?? '', /Image\("avatar"\)/);
});

test('SwiftUI generic backend preserves source frames for flow children', () => {
  const result = generateSwiftUIView({
    featureName: 'positioned',
    design: { id: 'd', name: 'Positioned', nodes: [{
      id: 'screen', name: 'Screen', type: 'FRAME', layout: { x: 0, y: 0, width: 320, height: 640 }, children: [
        { id: 'title', name: 'Title', type: 'TEXT', layout: { x: 24, y: 48, width: 120, height: 28 }, text: { content: 'Title' }, children: [], unsupportedProperties: [], provenance: [] },
      ], unsupportedProperties: [], provenance: [],
    }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /Text\("Title"\)[^\n]*frame\(width: 120, height: 28, alignment: \.topLeading\)[^\n]*offset\(x: 24, y: 48\)/);
});

test('SwiftUI containers preserve child accessibility targets for route automation', () => {
  const result = generateSwiftUIView({
    featureName: 'details',
    design: { id: 'd', name: 'Details', nodes: [{
      id: 'screen', name: 'Details', type: 'FRAME', layout: { width: 320, height: 640 }, children: [
        { id: 'button', name: 'Order Now', type: 'RECTANGLE', layout: { x: 0, y: 0, width: 120, height: 44 }, children: [], unsupportedProperties: [], provenance: [] },
      ], unsupportedProperties: [], provenance: [],
    }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  assert.match(result.files[0]?.contents ?? '', /accessibilityElement\(children: \.contain\)/);
});

test('SwiftUI generic text keeps short labels visible inside measured frames', () => {
  const result = generateSwiftUIView({
    featureName: 'Labels',
    design: { id: 'design', name: 'Labels', nodes: [{ id: 'screen', name: 'screen', type: 'FRAME', layout: { width: 430, height: 932 }, children: [{ id: 'portion', name: 'Portion', type: 'TEXT', layout: { x: 0, y: 0, width: 47, height: 19 }, text: { content: 'Portion' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [{ id: 'screen', provenance: [] }], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  assert.match(result.files[0]?.contents ?? '', /Text\("Portion"\).*minimumScaleFactor\(0\.5\)/);
});

test('SwiftUI generic text preserves Figma font metadata and color', () => {
  const result = generateSwiftUIView({
    featureName: 'typography',
    design: { id: 'd', name: 'Typography', nodes: [{ id: 'screen', name: 'Screen', type: 'FRAME', layout: { width: 430, height: 932 }, children: [{ id: 'title', name: 'Title', type: 'TEXT', layout: { x: 19, y: 28, width: 129, height: 61 }, text: { content: 'Foodgo', fontFamily: 'Lobster', fontSize: 45, fontWeight: 400, color: '#3c2f2f' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [{ id: 'typography', provenance: [] }], transitions: [], states: [], conflicts: [], diagnostics: [] },
  } as any);
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /Text\("Foodgo"\).*font\(\.custom\("Lobster", size: 45\)\.weight\(\.regular\)\)/);
  assert.match(source, /foregroundStyle\(Color\(red: 0\.235294/);
});

test('SwiftUI contract typography applies when tree hydration omits text metadata', () => {
  const result = generateSwiftUIView({
    featureName: 'contract-typography',
    design: { id: 'd', name: 'Typography', nodes: [{ id: 'screen', name: 'Screen', type: 'FRAME', layout: { width: 430, height: 932 }, children: [{ id: 'title', name: 'Title', type: 'TEXT', layout: { x: 19, y: 28, width: 129, height: 61 }, text: { content: 'Foodgo' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    screenContract: { id: 'contract-typography', designNodeId: 'screen', screenSize: { width: 430, height: 932 }, safeArea: { top: 0, bottom: 0, leading: 0, trailing: 0 }, contentPadding: [0, 0, 0, 0], components: [{ id: 'title', nodeId: 'title', kind: 'text', frame: { x: 19, y: 28, width: 129, height: 61 }, typography: 'Lobster 45/400', color: '#3c2f2f', provenance: [{ source: 'test', reference: 'contract-typography' }] }], assets: [], interactions: [], unresolvedQuestions: [], provenance: [{ source: 'test', reference: 'contract-typography' }] },
    flow: { version: '1.0', screens: [{ id: 'contract-typography', provenance: [] }], transitions: [], states: [], conflicts: [], diagnostics: [] },
  } as any);
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /Text\("Foodgo"\).*font\(\.custom\("Lobster", size: 45\)\.weight\(\.regular\)\)/);
});

test('SwiftUI contract typography accepts pixel-sized contract strings', () => {
  const result = generateSwiftUIView({
    featureName: 'contract-px-typography',
    design: { id: 'd', name: 'Typography', nodes: [{ id: 'screen', name: 'Screen', type: 'FRAME', layout: { width: 360, height: 800 }, children: [{ id: 'body', name: 'Body', type: 'TEXT', layout: { x: 16, y: 86, width: 320, height: 96 }, text: { content: 'Body copy' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    screenContract: { id: 'contract-px-typography', designNodeId: 'screen', screenSize: { width: 360, height: 800 }, safeArea: { top: 0, bottom: 0, leading: 0, trailing: 0 }, contentPadding: [0, 0, 0, 0], components: [{ id: 'body', nodeId: 'body', kind: 'text', frame: { x: 16, y: 86, width: 320, height: 96 }, typography: 'Poppins 14px', color: '#8d92a3', provenance: [{ source: 'test', reference: 'contract-px-typography' }] }], assets: [], interactions: [], unresolvedQuestions: [], provenance: [{ source: 'test', reference: 'contract-px-typography' }] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  } as any);
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /Text\("Body copy"\).*font\(\.custom\("Poppins", size: 14\)\.weight\(\.regular\)\)/);
});

test('SwiftUI generic backend renders a filled rectangle instead of EmptyView', () => {
  const result = generateSwiftUIView({
    featureName: 'canvas',
    design: { id: 'd', name: 'Canvas', nodes: [{
      id: 'screen', name: 'Canvas', type: 'FRAME', layout: { width: 430, height: 932 },
      children: [{
        id: 'panel', name: 'Panel', type: 'RECTANGLE',
        layout: { x: 12, y: 24, width: 180, height: 90 },
        style: { fill: '#112233', radius: 12, opacity: 0.8 },
        children: [], unsupportedProperties: [], provenance: [],
      }], unsupportedProperties: [], provenance: [],
    }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /Color\(red:/);
  assert.match(source, /frame\(width: 180, height: 90, alignment: \.topLeading\)/);
  assert.doesNotMatch(source, /EmptyView\(\)\.accessibilityIdentifier\("panel"\)/);
});

test('SwiftUI generic backend preserves measured vector strokes', () => {
  const result = generateSwiftUIView({
    featureName: 'controls',
    design: { id: 'd', name: 'Controls', nodes: [{ id: 'screen', name: 'Controls', type: 'FRAME', layout: { width: 360, height: 800 }, children: [{ id: 'plus', name: 'quantity-control', type: 'ROUNDED_RECTANGLE', layout: { x: 10, y: 10, width: 26, height: 26 }, style: { radius: 8, stroke: '#000000' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  assert.match(result.files[0]?.contents ?? '', /overlay\(RoundedRectangle\(cornerRadius: 8\)\.stroke\(Color\(red: 0\.000000/);
});

test('SwiftUI screen contract preserves measured fill and radius when tree hydration omits node style', () => {
  const result = generateSwiftUIView({
    featureName: 'contracted',
    design: { id: 'd', name: 'Contracted', nodes: [{
      id: 'screen', name: 'Screen', type: 'FRAME', layout: { width: 430, height: 932 },
      children: [
        { id: 'cta-background', name: 'Rectangle 75', type: 'RECTANGLE', layout: { x: 0, y: 0, width: 239, height: 70 }, children: [], unsupportedProperties: [], provenance: [] },
        { id: 'cta-label', name: 'ORDER NOW', type: 'TEXT', layout: { x: 64, y: 23, width: 111, height: 24 }, text: { content: 'ORDER NOW' }, children: [], unsupportedProperties: [], provenance: [] },
      ],
      unsupportedProperties: [], provenance: [],
    }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    screenContract: {
      id: 'contracted', designNodeId: 'screen', screenSize: { width: 430, height: 932 },
      safeArea: { top: 0, bottom: 0, leading: 0, trailing: 0 }, contentPadding: [0, 0, 0, 0],
      components: [
        { id: 'root', nodeId: 'screen', kind: 'screen', frame: { x: 0, y: 0, width: 430, height: 932 }, provenance: [{ source: 'test', reference: 'contracted' }] },
        { id: 'cta-background', nodeId: 'cta-background', kind: 'background', frame: { x: 0, y: 0, width: 239, height: 70 }, color: '#3c2f2f', radius: 20, shadow: { color: '#000000', opacity: 0.25, radius: 30, x: 0, y: 9 }, provenance: [{ source: 'test', reference: 'contracted' }] },
        { id: 'cta-label', nodeId: 'cta-label', kind: 'button', frame: { x: 64, y: 23, width: 111, height: 24 }, color: '#ffffff', provenance: [{ source: 'test', reference: 'contracted' }] },
      ],
      assets: [], interactions: [{ id: 'cta-to-payment', nodeId: 'cta-label', event: 'tap', transition: { to: 'payment', kind: 'push' }, provenance: [{ source: 'test', reference: 'contracted' }] }], unresolvedQuestions: [], provenance: [{ source: 'test', reference: 'contracted' }],
    },
    flow: { version: '1.0', screens: [{ id: 'contracted', provenance: [] }, { id: 'payment', provenance: [] }], transitions: [{ from: 'contracted', event: 'tap ORDER NOW', to: 'payment', provenance: [] }], states: [], conflicts: [], diagnostics: [] },
  } as any);
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /Color\(red:/);
  assert.match(source, /RoundedRectangle\(cornerRadius: 20\)/);
  assert.match(source, /shadow\(color: Color\(red:/);
  assert.match(source, /Button\("ORDER NOW"\).*foregroundStyle\(Color\(red: 1/);
  assert.doesNotMatch(source, /Color\.clear\.frame\(width: 239, height: 70/);
});

test('SwiftUI screen contract decorates measured card containers', () => {
  const result = generateSwiftUIView({
    featureName: 'card',
    design: { id: 'd', name: 'Card', nodes: [{ id: 'screen', name: 'Screen', type: 'FRAME', layout: { width: 430, height: 932 }, children: [{ id: 'card', name: 'Card', type: 'GROUP', layout: { x: 19, y: 355, width: 185, height: 225 }, children: [{ id: 'label', name: 'Label', type: 'TEXT', layout: { x: 11, y: 136, width: 117, height: 44 }, text: { content: 'Burger' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    screenContract: { id: 'card', designNodeId: 'screen', screenSize: { width: 430, height: 932 }, safeArea: { top: 0, bottom: 0, leading: 0, trailing: 0 }, contentPadding: [0, 0, 0, 0], components: [{ id: 'card', nodeId: 'card', kind: 'container', frame: { x: 19, y: 355, width: 185, height: 225 }, color: '#ffffff', radius: 20, shadow: { color: '#000000', opacity: 0.13, radius: 17, y: 6 }, provenance: [{ source: 'test', reference: 'card' }] }], assets: [], interactions: [], unresolvedQuestions: [], provenance: [{ source: 'test', reference: 'card' }] },
    flow: { version: '1.0', screens: [{ id: 'card', provenance: [] }], transitions: [], states: [], conflicts: [], diagnostics: [] },
  } as any);
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /clipShape\(RoundedRectangle\(cornerRadius: 20\)\)\.shadow\(color:/);
  assert.match(source, /frame\(width: 185, height: 225, alignment: \.topLeading\).*clipShape\(RoundedRectangle\(cornerRadius: 20\)\)/s);
});

test('SwiftUI generic backend does not clip zero-radius containers', () => {
  const result = generateSwiftUIView({
    featureName: 'zero-radius',
    design: { id: 'd', name: 'Zero radius', nodes: [{ id: 'screen', name: 'Screen', type: 'FRAME', layout: { width: 320, height: 640 }, children: [{ id: 'group', name: 'Group', type: 'GROUP', layout: { x: 0, y: 0, width: 200, height: 300 }, style: { radius: 0 }, children: [{ id: 'label', name: 'Label', type: 'TEXT', layout: { x: 0, y: 250, width: 100, height: 20 }, text: { content: 'Visible' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  } as any);
  assert.doesNotMatch(result.files[0]?.contents ?? '', /cornerRadius: 0/);
});

test('SwiftUI contract artwork can fill and clip a measured frame', () => {
  const result = generateSwiftUIView({
    featureName: 'artwork',
    design: { id: 'd', name: 'Artwork', nodes: [{ id: 'screen', name: 'Screen', type: 'FRAME', layout: { width: 430, height: 932 }, children: [{ id: 'nav', name: 'Group 16', type: 'VECTOR', layout: { x: 0, y: 856, width: 456, height: 90 }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    screenContract: {
      id: 'artwork', designNodeId: 'screen', screenSize: { width: 430, height: 932 }, safeArea: { top: 0, bottom: 0, leading: 0, trailing: 0 }, contentPadding: [0, 0, 0, 0],
      components: [{ id: 'root', nodeId: 'screen', kind: 'screen', frame: { x: 0, y: 0, width: 430, height: 932 }, provenance: [{ source: 'test', reference: 'artwork' }] }],
      assets: [{ nodeId: 'nav', resourceName: 'group-16', contentMode: 'fill', provenance: [{ source: 'test', reference: 'artwork' }] }], interactions: [], unresolvedQuestions: [], provenance: [{ source: 'test', reference: 'artwork' }],
    },
    assetBindings: [{ sourceNodeId: 'nav', resourceName: 'group-16' }],
    flow: { version: '1.0', screens: [{ id: 'artwork', provenance: [] }], transitions: [], states: [], conflicts: [], diagnostics: [] },
  } as any);
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /Image\("group-16", bundle: Bundle\.module\)\.resizable\(\)\.scaledToFill\(\)\.clipped\(\)/);
  assert.match(source, /\.accessibilityIdentifier\("nav"\)\.zIndex\(1\)/);
});

test('SwiftUI generic backend maps Flow presentation to sheet and fullScreenCover', () => {
  const result = generateSwiftUIView({
    featureName: 'checkout',
    design: { id: 'd', name: 'Checkout', nodes: [{ id: 'screen', name: 'Checkout', type: 'FRAME', children: [], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: {
      version: '1.0',
      screens: [{ id: 'checkout', provenance: [] }, { id: 'payment', presentation: 'sheet', provenance: [] }, { id: 'success', presentation: 'modal', provenance: [] }],
      transitions: [{ from: 'checkout', event: 'pay', to: 'payment', provenance: [] }, { from: 'checkout', event: 'success', to: 'success', provenance: [] }],
      states: [], conflicts: [], diagnostics: [],
    },
  });
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /\.sheet\(isPresented:/);
  assert.match(source, /\.fullScreenCover\(isPresented:/);
});

test('SwiftUI generator wires flow transitions to an injected coordinator', () => {
  const result = generateSwiftUIView({ featureName: 'food app', design: { id: 'd', name: 'd', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] }, flow: { version: '1.0', screens: [{ id: 'home', provenance: [] }, { id: 'product-1', provenance: [] }], transitions: [{ from: 'home', event: 'tap product', to: 'product-1', provenance: [] }], states: [], conflicts: [], diagnostics: [] } });
  assert.match(result.files[0]?.contents ?? '', /any FoodAppCoordinator/);
  assert.match(result.files[0]?.contents ?? '', /coordinator\.navigate/);
});

test('SwiftUI generator exposes the confirmed route case to runtime automation', () => {
  const result = generateSwiftUIView({ featureName: 'checkout', design: { id: 'd', name: 'd', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] }, flow: { version: '1.0', screens: [{ id: 'home', provenance: [] }, { id: 'payment', provenance: [] }], transitions: [{ from: 'home', event: 'tap order', to: 'payment', provenance: [] }], states: [], conflicts: [], diagnostics: [] } });
  assert.match(result.files[0]?.contents ?? '', /accessibilityIdentifier\("route-1"\)/);
});

test('SwiftUI FoodApp deduplicates repeated Flow events in the generated ViewModel switch', () => {
  const result = generateSwiftUIView({
    featureName: 'FoodApp',
    design: { id: 'food', name: 'FoodApp', nodes: [{ id: 'home', name: 'home', type: 'FRAME', layout: { width: 430, height: 932 }, children: [], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: {
      version: '1.0', screens: [], states: [], conflicts: [], diagnostics: [],
      transitions: [
        { from: 'product-1', event: 'tap checkout', to: 'payment', provenance: [] },
        { from: 'product-2', event: 'tap checkout', to: 'payment', provenance: [] },
      ],
    },
  } as any);
  const source = result.files[0]?.contents ?? '';
  assert.equal((source.match(/case \.tapCheckout:/g) ?? []).length, 1);
});

test('FoodApp SwiftUI generator emits native home, detail, and payment views', () => {
  const input = {
    featureName: 'FoodApp',
    design: {
      id: 'food', name: 'FoodApp', tokens: [], assets: [], diagnostics: [], provenance: [],
      nodes: [{ id: 'home', name: 'home', type: 'FRAME', layout: { width: 430, height: 932 }, children: [], unsupportedProperties: [], provenance: [] }],
    },
    flow: {
      screens: [], states: [], conflicts: [], diagnostics: [], source: 'test',
      transitions: [
        { from: 'home', event: 'tap product-1', to: 'product-1', provenance: [] },
        { from: 'product-1', event: 'tap checkout', to: 'payment', provenance: [] },
        { from: 'payment', event: 'submit', to: 'order-confirmation', provenance: [] },
        { from: 'order-confirmation', event: 'tap ok', to: 'home', provenance: [] },
      ],
    },
  } as any;
  const contents = generateSwiftUIView(input).files[0]?.contents ?? '';
  assert.match(contents, /Text\("Foodgo"\)/);
  assert.match(contents, /LazyVGrid/);
  assert.match(contents, /FoodAppProductDetailView/);
  assert.match(contents, /FoodAppPaymentView/);
  assert.match(contents, /FoodAppOrderConfirmationView/);
  assert.match(contents, /description: "The Cheeseburger Wendy's Burger is a classic fast food burger/);
  assert.match(contents, /Text\("26 mins"\)/);
  assert.match(contents, /UIImage\(named: "star", in: Bundle\.module/);
  assert.match(contents, /Text\("Spicy"\)/);
  assert.match(contents, /Slider\(/);
  assert.match(contents, /Text\("Portion"\)/);
  assert.match(contents, /\$8\.24/);
  assert.match(contents, /Text\("ORDER NOW"\)/);
  assert.match(contents, /Button\("PAY NOW"\)/);
  assert.match(contents, /Text\("Payment methods"\)/);
  assert.match(contents, /NavigationLink\(destination: FoodAppPaymentView\(navigationPath: \$navigationPath/);
  assert.match(contents, /navigationPath\.removeAll\(\)/);
});

test('FoodApp SwiftUI Place order shows confirmation before returning to home', () => {
  const input = {
    featureName: 'FoodApp',
    design: { id: 'food', name: 'FoodApp', nodes: [{ id: 'home', name: 'home', type: 'FRAME', layout: { width: 430, height: 932 }, children: [], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: {
      version: '1.0', screens: [], states: [], conflicts: [], diagnostics: [], source: 'test',
      transitions: [
        { from: 'payment', event: 'submit', to: 'order-confirmation', provenance: [] },
        { from: 'order-confirmation', event: 'tap ok', to: 'home', provenance: [] },
      ],
    },
  } as any;
  const contents = generateSwiftUIView(input).files[0]?.contents ?? '';
  assert.doesNotMatch(contents, /navigationPath\.append\(\.orderConfirmation\)/);
  assert.match(contents, /Button\("GO BACK"\)/);
  assert.doesNotMatch(contents, /Button\("OK"\)/);
  assert.match(contents, /navigationPath\.removeAll\(\)/);
});

test('SwiftUI FoodApp uses explicit destinations for embedded product and payment pushes', () => {
  const input = {
    featureName: 'FoodApp',
    design: { id: 'food', name: 'FoodApp', tokens: [], assets: [], diagnostics: [], provenance: [], nodes: [{ id: 'home', name: 'home', type: 'FRAME', layout: { width: 430, height: 932 }, children: [], unsupportedProperties: [], provenance: [] }] },
    flow: { screens: [], states: [], conflicts: [], diagnostics: [], source: 'test', transitions: [] },
  } as any;
  const contents = generateSwiftUIView(input).files[0]?.contents ?? '';
  assert.match(contents, /NavigationStack\(path: \$navigationPath\)/);
  assert.match(contents, /NavigationLink\(destination: FoodAppProductDetailView\(navigationPath: \$navigationPath/);
  assert.match(contents, /case \.payment: FoodAppPaymentView\(navigationPath: \$navigationPath/);
  assert.match(contents, /GridItem\(\.fixed\(185\)\)/);
  assert.match(contents, /spacing: 22/);
  assert.match(contents, /case \.product2:/);
  assert.match(contents, /case \.product3:/);
  assert.match(contents, /case \.product4:/);
  assert.match(contents, /navigationDestination\(for: FoodAppRoute\.self\)/);
  assert.match(contents, /case \.product1: FoodAppProductDetailView/);
  assert.match(contents, /accessibilityLabel\("User"\)/);
  assert.match(contents, /accessibilityLabel\("Support"\)/);
});

test('SwiftUI FoodApp embedded Place order dismisses host-owned payment and product pushes', () => {
  const input = {
    featureName: 'FoodApp',
    design: { id: 'food', name: 'FoodApp', tokens: [], assets: [], diagnostics: [], provenance: [], nodes: [{ id: 'home', name: 'home', type: 'FRAME', children: [], unsupportedProperties: [], provenance: [] }] },
    flow: { screens: [], states: [], conflicts: [], diagnostics: [], source: 'test', transitions: [{ from: 'payment', event: 'submit', to: 'home', provenance: [] }] },
  } as any;
  const contents = generateSwiftUIView(input).files[0]?.contents ?? '';
  assert.doesNotMatch(contents, /navigationPath\.append\(\.orderConfirmation\)/);
  assert.match(contents, /Button\("GO BACK"\)/);
  assert.match(contents, /if isConfirmationPresented/);
  assert.match(contents, /onPresentConfirmation/);
});

test('SwiftUI FoodApp exposes a host root action for payment submission', () => {
  const input = {
    featureName: 'FoodApp',
    design: { id: 'food', name: 'FoodApp', tokens: [], assets: [], diagnostics: [], provenance: [], nodes: [{ id: 'home', name: 'home', type: 'FRAME', children: [], unsupportedProperties: [], provenance: [] }] },
    flow: { screens: [], states: [], conflicts: [], diagnostics: [], source: 'test', transitions: [{ from: 'payment', event: 'submit', to: 'home', provenance: [] }] },
  } as any;
  const contents = generateSwiftUIView(input).files[0]?.contents ?? '';
  assert.match(contents, /onSubmitToRoot: \(\(\) -> Void\)\? = nil/);
  assert.match(contents, /FoodAppPrimaryButtonStyle/);
});

test('SwiftUI FoodApp search uses source SVG groups inside native controls', () => {
  const input = {
    featureName: 'FoodApp',
    design: {
      id: 'food', name: 'FoodApp', tokens: [], assets: [], diagnostics: [], provenance: [],
      nodes: [{ id: 'home', name: 'home', type: 'FRAME', children: [
        { id: 'search-group', name: 'Group 1', type: 'GROUP', layout: { width: 104, height: 24 }, children: [], unsupportedProperties: [], provenance: [] },
        { id: 'filter-group', name: 'Group 2', type: 'GROUP', layout: { width: 60, height: 60 }, children: [], unsupportedProperties: [], provenance: [] },
      ], unsupportedProperties: [], provenance: [] }],
    },
    assetBindings: [{ sourceNodeId: 'search-group', resourceName: 'group-1' }, { sourceNodeId: 'filter-group', resourceName: 'group-2' }],
    flow: { screens: [], states: [], conflicts: [], diagnostics: [], source: 'test', transitions: [] },
  } as any;
  const contents = generateSwiftUIView(input).files[0]?.contents ?? '';
  assert.match(contents, /UIImage\(named: "group-1", in: Bundle\.module/);
  assert.match(contents, /UIImage\(named: "group-2", in: Bundle\.module/);
  assert.match(contents, /TextField\("", text: \.constant\(""\)\)/);
  assert.match(contents, /accessibilityLabel\("Filter"\)/);
});

test('SwiftUI FoodApp cards use the exported asset binding for each image node', () => {
  const input = {
    featureName: 'FoodApp',
    design: {
      id: 'food', name: 'FoodApp', tokens: [], assets: [], diagnostics: [], provenance: [],
      nodes: [{ id: 'home', name: 'home', type: 'FRAME', layout: { width: 430, height: 932 }, children: [{
        id: 'card-1', name: 'Group 10', type: 'GROUP', children: [
          { id: 'title-1', name: 'Cheeseburger Wendy\'s Burger', type: 'TEXT', text: { content: 'Cheeseburger Wendy\'s Burger' }, children: [], unsupportedProperties: [], provenance: [] },
          { id: 'image-1', name: 'image 6', type: 'RECTANGLE', children: [], unsupportedProperties: [], provenance: [] },
        ], unsupportedProperties: [], provenance: [],
      }], unsupportedProperties: [], provenance: [] }],
    },
    assetBindings: [{ sourceNodeId: 'image-1', resourceName: 'image-6' }],
    flow: { screens: [], states: [], conflicts: [], diagnostics: [], source: 'test', transitions: [] },
  } as any;
  const contents = generateSwiftUIView(input).files[0]?.contents ?? '';
  assert.match(contents, /image: "image-6"/);
});

test('SwiftUI FoodApp cards preserve each image node size', () => {
  const input = {
    featureName: 'FoodApp',
    design: {
      id: 'food', name: 'FoodApp', tokens: [], assets: [], diagnostics: [], provenance: [],
      nodes: [{ id: 'home', name: 'home', type: 'FRAME', layout: { width: 430, height: 932 }, children: [
        { id: 'card-1', name: 'Group 10', type: 'GROUP', children: [
          { id: 'title-1', name: 'Cheeseburger Wendy\'s Burger', type: 'TEXT', text: { content: 'Cheeseburger Wendy\'s Burger' }, children: [], unsupportedProperties: [], provenance: [] },
          { id: 'image-1', name: 'image 6', type: 'RECTANGLE', layout: { x: 32, y: 5, width: 120, height: 122 }, children: [], unsupportedProperties: [], provenance: [] },
        ], unsupportedProperties: [], provenance: [] },
        { id: 'card-2', name: 'Group 11', type: 'GROUP', children: [
          { id: 'title-2', name: 'Hamburger Chicken Burger', type: 'TEXT', text: { content: 'Hamburger Chicken Burger' }, children: [], unsupportedProperties: [], provenance: [] },
          { id: 'image-2', name: 'image 4', type: 'RECTANGLE', layout: { x: 20, y: 0, width: 150, height: 138 }, children: [], unsupportedProperties: [], provenance: [] },
        ], unsupportedProperties: [], provenance: [] },
      ], unsupportedProperties: [], provenance: [] }],
    },
    assetBindings: [{ sourceNodeId: 'image-1', resourceName: 'image-6' }, { sourceNodeId: 'image-2', resourceName: 'image-4' }],
    flow: { screens: [], states: [], conflicts: [], diagnostics: [], source: 'test', transitions: [] },
  } as any;
  const contents = generateSwiftUIView(input).files[0]?.contents ?? '';
  assert.match(contents, /image: "image-6", imageX: 32, imageY: 5, imageWidth: 120, imageHeight: 122/);
  assert.match(contents, /image: "image-4", imageX: 20, imageY: 0, imageWidth: 150, imageHeight: 138/);
  assert.match(contents, /position\(x: imageX \+ imageWidth \/ 2, y: imageY \+ imageHeight \/ 2\)/);
  assert.match(contents, /frame\(width: ratingWidth, height: ratingHeight, alignment: \.leading\)\.position\(x: ratingX \+ ratingWidth \/ 2, y: ratingY \+ ratingHeight \/ 2\)/);
  assert.match(contents, /position\(x: imageX \+ imageWidth \/ 2, y: imageY \+ imageHeight \/ 2\)/);
  assert.match(contents, /position\(x: ratingX \+ ratingWidth \/ 2, y: ratingY \+ ratingHeight \/ 2\)/);
  assert.match(contents, /lineLimit\(2\).*fixedSize\(horizontal: false, vertical: true\)/);
  assert.match(contents, /allowsTightening\(true\)\.minimumScaleFactor\(0\.75\)/);
  assert.match(contents, /lineLimit\(1\)\.fixedSize\(horizontal: true, vertical: true\)\.frame\(width: 23/);
});

test('SwiftUI FoodApp ratings use the SVG star asset and Figma rating text frame', () => {
  const input = {
    featureName: 'FoodApp',
    design: {
      id: 'food', name: 'FoodApp', tokens: [], assets: [], diagnostics: [], provenance: [],
      nodes: [{ id: 'home', name: 'home', type: 'FRAME', children: [{
        id: 'card-1', name: 'Group 10', type: 'GROUP', children: [
          { id: 'title-1', name: 'Cheeseburger Wendy\'s Burger', type: 'TEXT', text: { content: 'Cheeseburger Wendy\'s Burger' }, children: [], unsupportedProperties: [], provenance: [] },
          { id: 'image-1', name: 'image 6', type: 'RECTANGLE', layout: { x: 32, y: 5, width: 120, height: 122 }, children: [], unsupportedProperties: [], provenance: [] },
          { id: 'rating-1', name: 'Group 9', type: 'GROUP', layout: { x: 11, y: 189, width: 44, height: 22 }, children: [
            { id: 'rating-text', name: '4.9', type: 'TEXT', text: { content: '4.9' }, children: [], unsupportedProperties: [], provenance: [] },
          ], unsupportedProperties: [], provenance: [] },
        ], unsupportedProperties: [], provenance: [],
      }], unsupportedProperties: [], provenance: [] }],
    },
    assetBindings: [{ sourceNodeId: 'image-1', resourceName: 'image-6' }, { sourceNodeId: 'star-1', resourceName: 'star' }],
    flow: { screens: [], states: [], conflicts: [], diagnostics: [], source: 'test', transitions: [] },
  } as any;
  const contents = generateSwiftUIView(input).files[0]?.contents ?? '';
  assert.match(contents, /rating: "4\.9", ratingX: 11, ratingY: 189, ratingWidth: 44, ratingHeight: 22/);
  assert.match(contents, /UIImage\(named: "star", in: Bundle\.module/);
  assert.match(contents, /font\(\.system\(size: 16, weight: \.medium\)\)/);
});

test('SwiftUI FoodApp detail uses a short custom back bar and structured payment rows', () => {
  const contents = generateSwiftUIView({ featureName: 'FoodApp', design: { id: 'food', name: 'FoodApp', nodes: [{ id: 'home', name: 'home', type: 'FRAME', children: [], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] }, flow: { screens: [], states: [], conflicts: [], diagnostics: [], transitions: [] } } as any).files.find((file) => file.path.endsWith('View.swift'))?.contents ?? '';
  assert.match(contents, /Button\s*\{ dismiss\(\) \}/);
  assert.match(contents, /frame\(height: 28\)/);
  assert.doesNotMatch(contents, /Text\("⌕"\)/);
  assert.match(contents, /paymentRow\("Order", "\$16\.48"\)/);
});
