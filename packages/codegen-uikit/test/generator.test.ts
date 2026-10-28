import test from 'node:test';
import assert from 'node:assert/strict';
import { generateUIKitViewController as generateUIKitViewControllerImpl } from '../src/generator.ts';
import { generateFoodAppCompatibilityViewController } from '../src/compatibility.ts';

function generateUIKitViewController(input: any) {
  return input.featureName === 'FoodApp' ? generateFoodAppCompatibilityViewController(input) : generateUIKitViewControllerImpl(input);
}

test('UIKit generator emits an injectable UIViewController shell', () => {
  const result = generateUIKitViewController({ featureName: 'login', design: { id: 'd', name: 'd', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] }, flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] } });
  assert.match(result.files[0]?.contents ?? '', /final class LoginViewController: UIViewController/);
  assert.match(result.files[0]?.contents ?? '', /NSLayoutConstraint/);
  assert.match(result.files[0]?.contents ?? '', /viewModel.send/);
});

test('UIKit generated view controller is main-actor isolated when its coordinator default is main-actor isolated', () => {
  const result = generateUIKitViewController({ featureName: 'login', design: { id: 'd', name: 'd', nodes: [], tokens: [], assets: [], diagnostics: [], provenance: [] }, flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] } });
  assert.match(result.files[0]?.contents ?? '', /@MainActor public final class LoginViewController: UIViewController/);
});

test('UIKit generic backend consumes UI IR with native views, source frames, assets, and touch targets', () => {
  const result = generateUIKitViewController({
    featureName: 'profile',
    design: { id: 'd', name: 'Profile', nodes: [{ id: 'screen', name: 'Profile', type: 'FRAME', layout: { width: 320, height: 640 }, children: [
      { id: 'title', name: 'Title', type: 'TEXT', layout: { x: 16, y: 20, width: 200, height: 28 }, text: { content: 'Profile' }, children: [], unsupportedProperties: [], provenance: [] },
      { id: 'avatar', name: 'Avatar', type: 'IMAGE', layout: { x: 16, y: 64, width: 48, height: 48 }, assetRef: 'avatar.svg', children: [], unsupportedProperties: [], provenance: [] },
      { id: 'save', name: 'Save', type: 'RECTANGLE', layout: { x: 16, y: 140, width: 120, height: 48 }, children: [], unsupportedProperties: [], provenance: [] },
    ], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    assetBindings: [{ sourceNodeId: 'avatar', resourceName: 'avatar' }],
    flow: { version: '1.0', screens: [{ id: 'profile', provenance: [] }], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /UILabel\(\)/);
  assert.match(source, /UIImageView\(image: UIImage\(named: "avatar", in: Bundle\.module/);
  assert.match(source, /UIButton\(type: \.system\)/);
  assert.match(source, /title\.widthAnchor\.constraint\(equalToConstant: 200\)/);
  assert.match(source, /save\.accessibilityIdentifier = "save"/);
  assert.match(source, /ViewModelProtocol/);
});

test('UIKit generic backend renders evidence-backed semantic icons without asset refs', () => {
  const result = generateUIKitViewController({
    featureName: 'details',
    design: { id: 'd', name: 'Details', nodes: [{ id: 'screen', name: 'Details', type: 'FRAME', layout: { width: 360, height: 800 }, children: [
      { id: 'back', name: 'icon/navigation/arrow_back_ios_24px', type: 'VECTOR', layout: { x: 7, y: 5, width: 9, height: 15 }, children: [], unsupportedProperties: [], provenance: [] },
      { id: 'star', name: 'Star 1', type: 'VECTOR', layout: { x: 0, y: 0, width: 16, height: 16 }, children: [], style: { fill: '#eb0029' }, unsupportedProperties: [], provenance: [] },
    ], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /UIImage\(systemName: "chevron\.left"\)/);
  assert.match(source, /UIImage\(systemName: "star\.fill"\)/);
});

test('UIKit generator preserves the source node identifier and exposes the confirmed route case', () => {
  const result = generateUIKitViewController({
    featureName: 'checkout',
    design: { id: 'd', name: 'Checkout', nodes: [{ id: 'screen', name: 'Checkout', type: 'FRAME', layout: { width: 320, height: 640 }, children: [{ id: 'order', name: 'Order', type: 'TEXT', layout: { x: 16, y: 140, width: 120, height: 48 }, text: { content: 'Order' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    screenContract: { id: 'home', designNodeId: 'screen', screenSize: { width: 320, height: 640 }, safeArea: { top: 0, bottom: 0, leading: 0, trailing: 0 }, contentPadding: [0, 0, 0, 0], components: [{ id: 'order', nodeId: 'order', kind: 'button', frame: { x: 16, y: 140, width: 120, height: 48 }, color: '#fbf2cf', provenance: [{ source: 'test', reference: 'route' }] }], assets: [], interactions: [{ id: 'order-to-payment', nodeId: 'order', event: 'tap Order', transition: { to: 'payment', kind: 'push' }, provenance: [{ source: 'test', reference: 'route' }] }], unresolvedQuestions: [], provenance: [{ source: 'test', reference: 'route' }] },
    flow: { version: '1.0', screens: [{ id: 'home', provenance: [] }, { id: 'payment', provenance: [] }], transitions: [{ from: 'home', event: 'tap Order', to: 'payment', provenance: [] }], states: [], conflicts: [], diagnostics: [] },
  } as any);
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /order\.accessibilityIdentifier = "order"/);
  assert.match(source, /order\.accessibilityValue = "route-1"/);
  assert.match(source, /order\.setTitleColor\(UIColor\(openPencilHex: "#fbf2cf"\), for: \.normal\)/);
});

test('UIKit generic backend preserves measured text color and typography', () => {
  const result = generateUIKitViewController({
    featureName: 'typography',
    design: { id: 'd', name: 'Typography', nodes: [{ id: 'screen', name: 'Screen', type: 'FRAME', layout: { width: 320, height: 640 }, children: [{ id: 'title', name: 'Title', type: 'TEXT', layout: { x: 10, y: 20, width: 180, height: 28 }, text: { content: 'Title', fontFamily: 'Poppins', fontSize: 20, fontWeight: 600, color: '#112233' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /UIFont\(name: "Poppins", size: 20\)/);
  assert.match(source, /textColor = UIColor\(openPencilHex: "#112233"\)/);
  assert.match(source, /adjustsFontSizeToFitWidth = true/);
});

test('UIKit generic backend applies Screen Contract typography when hydration omits font metadata', () => {
  const result = generateUIKitViewController({
    featureName: 'typography-contract',
    design: { id: 'd', name: 'Typography', nodes: [{ id: 'screen', name: 'Screen', type: 'FRAME', layout: { width: 320, height: 640 }, children: [{ id: 'title', name: 'Title', type: 'TEXT', layout: { x: 10, y: 20, width: 180, height: 28 }, text: { content: 'Title' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    screenContract: { id: 'typography-contract', designNodeId: 'screen', screenSize: { width: 320, height: 640 }, safeArea: { top: 0, bottom: 0, leading: 0, trailing: 0 }, contentPadding: [0, 0, 0, 0], components: [{ id: 'title', nodeId: 'title', kind: 'text', frame: { x: 10, y: 20, width: 180, height: 28 }, typography: 'Poppins 18px', provenance: [{ source: 'test', reference: 'typography-contract' }] }], assets: [], interactions: [], unresolvedQuestions: [], provenance: [{ source: 'test', reference: 'typography-contract' }] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  } as any);
  assert.match(result.files[0]?.contents ?? '', /UIFont\(name: "Poppins", size: 18\)/);
});

test('UIKit generic backend applies Screen Contract fill and radius when tree style is absent', () => {
  const result = generateUIKitViewController({
    featureName: 'contracted',
    design: { id: 'd', name: 'Contracted', nodes: [{ id: 'screen', name: 'Screen', type: 'FRAME', layout: { width: 320, height: 640 }, children: [{ id: 'cta', name: 'CTA', type: 'RECTANGLE', layout: { x: 10, y: 20, width: 200, height: 45 }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    screenContract: { id: 'contracted', designNodeId: 'screen', screenSize: { width: 320, height: 640 }, safeArea: { top: 0, bottom: 0, leading: 0, trailing: 0 }, contentPadding: [0, 0, 0, 0], components: [{ id: 'cta', nodeId: 'cta', kind: 'container', frame: { x: 10, y: 20, width: 200, height: 45 }, color: '#eb0029', radius: 8, provenance: [{ source: 'test', reference: 'contracted' }] }], assets: [], interactions: [], unresolvedQuestions: [], provenance: [{ source: 'test', reference: 'contracted' }] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /backgroundColor = UIColor\(openPencilHex: "#eb0029"\)/);
  assert.match(source, /layer\.cornerRadius = 8/);
});

test('UIKit generated design canvas anchors to the view origin for node-matched screenshots', () => {
  const result = generateUIKitViewController({
    featureName: 'canvas-origin',
    design: { id: 'd', name: 'Canvas', nodes: [{ id: 'screen', name: 'Screen', type: 'FRAME', layout: { width: 320, height: 640 }, children: [], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    screenContract: { id: 'canvas-origin', designNodeId: 'screen', screenSize: { width: 320, height: 640 }, safeArea: { top: 0, bottom: 0, leading: 0, trailing: 0 }, contentPadding: [0, 0, 0, 0], components: [], assets: [], interactions: [], unresolvedQuestions: [], provenance: [{ source: 'test', reference: 'canvas-origin' }] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  } as any);
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /contentView\.leadingAnchor\.constraint\(equalTo: view\.leadingAnchor\)/);
  assert.match(source, /contentView\.topAnchor\.constraint\(equalTo: view\.topAnchor\)/);
  assert.doesNotMatch(source, /contentView\.topAnchor\.constraint\(equalTo: view\.safeAreaLayoutGuide\.topAnchor\)/);
});

test('UIKit generic backend renders exported artwork bindings as UIImageView assets', () => {
  const result = generateUIKitViewController({
    featureName: 'delivery',
    design: { id: 'd', name: 'Delivery', nodes: [{ id: 'screen', name: 'Delivery', type: 'FRAME', layout: { width: 375, height: 812 }, children: [
      { id: 'artwork', name: 'Splash artwork', type: 'RECTANGLE', layout: { x: 0, y: 0, width: 375, height: 812 }, children: [], unsupportedProperties: [], provenance: [] },
    ], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    assetBindings: [{ sourceNodeId: 'artwork', resourceName: 'splash' }],
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /UIImageView\(image: UIImage\(named: "splash", in: Bundle\.module/);
  assert.match(source, /artwork\.contentMode = \.scaleAspectFit/);
  assert.doesNotMatch(source, /let artwork = UIView\(\)/);
});

test('UIKit non-package output can load assets from the application bundle', () => {
  const result = generateUIKitViewController({
    featureName: 'delivery', resourceBundle: 'main',
    design: { id: 'd', name: 'Delivery', nodes: [{ id: 'screen', name: 'Delivery', type: 'FRAME', layout: { width: 375, height: 812 }, children: [{ id: 'artwork', name: 'Artwork', type: 'IMAGE', children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    assetBindings: [{ sourceNodeId: 'artwork', resourceName: 'artwork' }],
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  assert.match(result.files[0]?.contents ?? '', /UIImage\(named: "artwork", in: Bundle\.main/);
});

test('UIKit generic backend emits its color helper when rendering styled containers', () => {
  const result = generateUIKitViewController({
    featureName: 'canvas',
    design: { id: 'd', name: 'Canvas', nodes: [{ id: 'screen', name: 'Canvas', type: 'FRAME', layout: { width: 430, height: 932 }, children: [{ id: 'panel', name: 'Panel', type: 'RECTANGLE', layout: { width: 120, height: 80 }, style: { fill: '#112233' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  const source = result.files[0]?.contents ?? '';
  assert.match(source, /convenience init\(openPencilHex hex: String\)/);
});

test('UIKit generic backend preserves measured vector strokes', () => {
  const result = generateUIKitViewController({
    featureName: 'controls',
    design: { id: 'd', name: 'Controls', nodes: [{ id: 'screen', name: 'Controls', type: 'FRAME', layout: { width: 360, height: 800 }, children: [{ id: 'plus', name: 'quantity-control', type: 'ROUNDED_RECTANGLE', layout: { x: 10, y: 10, width: 26, height: 26 }, style: { radius: 8, stroke: '#000000' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] },
    flow: { version: '1.0', screens: [], transitions: [], states: [], conflicts: [], diagnostics: [] },
  });
  assert.match(result.files[0]?.contents ?? '', /layer\.borderColor = UIColor\(openPencilHex: "#000000"\)\.cgColor/);
  assert.match(result.files[0]?.contents ?? '', /layer\.borderWidth = 1/);
});

test('UIKit FoodApp compatibility adapter wires flow transitions to an injected coordinator', () => {
  const result = generateUIKitViewController({ featureName: 'FoodApp', design: { id: 'd', name: 'd', nodes: [{ id: 'home', name: 'Home', type: 'FRAME', layout: { width: 320, height: 640 }, children: [{ id: 'product-button', name: 'Product', type: 'RECTANGLE', layout: { x: 16, y: 20, width: 120, height: 48 }, text: { content: 'tap product' }, children: [], unsupportedProperties: [], provenance: [] }], unsupportedProperties: [], provenance: [] }], tokens: [], assets: [], diagnostics: [], provenance: [] }, flow: { version: '1.0', screens: [{ id: 'home', provenance: [] }, { id: 'product-1', provenance: [] }], transitions: [{ from: 'home', event: 'tap product', to: 'product-1', provenance: [] }], states: [], conflicts: [], diagnostics: [] } });
  assert.match(result.files[0]?.contents ?? '', /any FoodAppCoordinator/);
  assert.match(result.files[0]?.contents ?? '', /coordinator\.navigate/);
});

test('FoodApp native cards and payment tab use matching Flow IR transitions', () => {
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
        { from: 'home', event: 'tap product-2', to: 'product-2', provenance: [] },
        { from: 'home', event: 'tap product-3', to: 'product-3', provenance: [] },
        { from: 'home', event: 'tap product-4', to: 'product-4', provenance: [] },
        { from: 'home', event: 'tap payment', to: 'payment', provenance: [] },
        { from: 'home', event: 'tap profile', to: 'user-profile', provenance: [] },
        { from: 'home', event: 'tap support', to: 'customer-support', provenance: [] },
      ],
    },
  } as any;
  const contents = generateUIKitViewController(input).files[0]?.contents ?? '';
  assert.match(contents, /\.product1, transition: \.homeToProduct1TapProduct1/);
  assert.match(contents, /\.product2, transition: \.homeToProduct2TapProduct2/);
  assert.match(contents, /\.product3, transition: \.homeToProduct3TapProduct3/);
  assert.match(contents, /\.product4, transition: \.homeToProduct4TapProduct4/);
  assert.match(contents, /\.userProfile, transition: \.homeToUserProfileTapProfile/);
  assert.match(contents, /\.customerSupport, transition: \.homeToCustomerSupportTapSupport/);
});

test('FoodApp product cards reserve bounded space for image and title content', () => {
  const input = {
    featureName: 'FoodApp',
    design: {
      id: 'food', name: 'FoodApp', tokens: [], assets: [], diagnostics: [], provenance: [],
      nodes: [{ id: 'home', name: 'home', type: 'FRAME', layout: { width: 430, height: 932 }, children: [], unsupportedProperties: [], provenance: [] }],
    },
    flow: { screens: [], states: [], conflicts: [], diagnostics: [], source: 'test', transitions: [] },
  } as any;
  const contents = generateUIKitViewController(input).files[0]?.contents ?? '';
  assert.match(contents, /let cardImageView = UIImageView\(image: UIImage\(named: imageName/);
  assert.match(contents, /imageX: 32, imageY: 5, imageWidth: 120, imageHeight: 122/);
  assert.match(contents, /button\.accessibilityLabel = title/);
});

test('FoodApp product cards preserve each image frame relative to its card', () => {
  const input = {
    featureName: 'FoodApp',
    design: {
      id: 'food', name: 'FoodApp', tokens: [], assets: [], diagnostics: [], provenance: [],
      nodes: [{ id: 'home', name: 'home', type: 'FRAME', layout: { width: 430, height: 932 }, children: [
        { id: 'card-1', name: 'Group 10', type: 'GROUP', layout: { x: 0, y: 0, width: 185, height: 225 }, children: [
          { id: 'title-1', name: "Cheeseburger Wendy's Burger", type: 'TEXT', layout: { x: 11, y: 136, width: 117, height: 44 }, text: { content: "Cheeseburger Wendy's Burger" }, children: [], unsupportedProperties: [], provenance: [] },
          { id: 'image-1', name: 'image 6', type: 'RECTANGLE', layout: { x: 32, y: 5, width: 120, height: 122 }, children: [], unsupportedProperties: [], provenance: [] },
        ], unsupportedProperties: [], provenance: [] },
        { id: 'card-2', name: 'Group 11', type: 'GROUP', layout: { x: 207, y: 0, width: 185, height: 225 }, children: [
          { id: 'title-2', name: 'Hamburger Veggie Burger', type: 'TEXT', layout: { x: 11, y: 136, width: 117, height: 44 }, text: { content: 'Hamburger Veggie Burger' }, children: [], unsupportedProperties: [], provenance: [] },
          { id: 'image-2', name: 'image 5', type: 'RECTANGLE', layout: { x: 32, y: 11, width: 120, height: 120 }, children: [], unsupportedProperties: [], provenance: [] },
        ], unsupportedProperties: [], provenance: [] },
      ], unsupportedProperties: [], provenance: [] }],
    },
    flow: { screens: [], states: [], conflicts: [], diagnostics: [], source: 'test', transitions: [] },
  } as any;
  const contents = generateUIKitViewController(input).files[0]?.contents ?? '';
  assert.match(contents, /imageX: 32, imageY: 5, imageWidth: 120, imageHeight: 122/);
  assert.match(contents, /imageX: 32, imageY: 11, imageWidth: 120, imageHeight: 120/);
  assert.match(contents, /cardImageView\.leadingAnchor\.constraint\(equalTo: button\.leadingAnchor, constant: imageX\)/);
  assert.match(contents, /cardImageView\.topAnchor\.constraint\(equalTo: button\.topAnchor, constant: imageY\)/);
  assert.match(contents, /cardImageView\.widthAnchor\.constraint\(equalToConstant: imageWidth\)/);
  assert.match(contents, /cardImageView\.heightAnchor\.constraint\(equalToConstant: imageHeight\)/);
  assert.match(contents, /titleX: 11, titleY: 136, titleWidth: 117, titleHeight: 44/);
  assert.match(contents, /cardTitleLabel\.topAnchor\.constraint\(equalTo: button\.topAnchor, constant: titleY\)/);
  assert.match(contents, /cardTitleLabel\.widthAnchor\.constraint\(equalToConstant: titleWidth\)/);
  assert.match(contents, /cardTitleLabel\.heightAnchor\.constraint\(equalToConstant: titleHeight\)/);
  assert.match(contents, /cardTitleLabel\.allowsDefaultTighteningForTruncation = true/);
  assert.match(contents, /cardTitleLabel\.adjustsFontSizeToFitWidth = true/);
  assert.match(contents, /cardTitleLabel\.minimumScaleFactor = 0\.75/);
  assert.match(contents, /row0\.spacing = 22/);
  assert.match(contents, /row0\.distribution = \.fill/);
  assert.match(contents, /button\.widthAnchor\.constraint\(equalToConstant: 185\)/);
  assert.match(contents, /UIImage\(named: "star", in: Bundle\.module/);
  assert.doesNotMatch(contents, /FoodAppStarView/);
  assert.match(contents, /ratingLabel\.font = UIFont\.systemFont\(ofSize: 16, weight: \.medium\)/);
  assert.match(contents, /ratingLabel\.adjustsFontSizeToFitWidth = true/);
  assert.match(contents, /ratingStack\.spacing = 5/);
  assert.match(contents, /ratingStack\.topAnchor\.constraint\(equalTo: button\.topAnchor, constant: ratingY\)/);
});

test('UIKit FoodApp cards use the exported asset binding for each image node', () => {
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
  const contents = generateUIKitViewController(input).files[0]?.contents ?? '';
  assert.match(contents, /makeProductCard\(title: "Cheeseburger Wendy's Burger"[^\n]+imageName: "image-6"/);
});

test('UIKit FoodApp search uses native controls with source SVG group bindings', () => {
  const input = {
    featureName: 'FoodApp',
    design: {
      id: 'food', name: 'FoodApp', tokens: [], assets: [], diagnostics: [], provenance: [],
      nodes: [{ id: 'home', name: 'home', type: 'FRAME', layout: { width: 430, height: 932 }, children: [
        { id: 'search-group', name: 'Group 1', type: 'GROUP', layout: { x: 20, y: 18, width: 104, height: 24 }, children: [], unsupportedProperties: [], provenance: [] },
        { id: 'filter-group', name: 'Group 2', type: 'GROUP', layout: { x: 332, y: 0, width: 60, height: 60 }, children: [], unsupportedProperties: [], provenance: [] },
      ], unsupportedProperties: [], provenance: [] }],
    },
    flow: { screens: [], states: [], conflicts: [], diagnostics: [], source: 'test', transitions: [] },
    assetBindings: [{ sourceNodeId: 'search-group', resourceName: 'group-1' }, { sourceNodeId: 'filter-group', resourceName: 'group-2' }],
  } as any;
  const contents = generateUIKitViewController(input).files[0]?.contents ?? '';
  assert.match(contents, /let searchContainer = UIView\(\)/);
  assert.match(contents, /UIImage\(named: "group-1", in: Bundle\.module/);
  assert.match(contents, /UIImage\(named: "group-2", in: Bundle\.module/);
  assert.match(contents, /search\.widthAnchor\.constraint\(equalToConstant: 319\)/);
  assert.match(contents, /filterButton\.widthAnchor\.constraint\(equalToConstant: 60\)/);
});

test('FoodApp native flow emits product detail and payment destinations', () => {
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
  const contents = generateUIKitViewController(input).files[0]?.contents ?? '';
  assert.match(contents, /final class FoodAppProductViewController: UIViewController/);
  assert.match(contents, /final class FoodAppPaymentViewController: UIViewController/);
  assert.match(contents, /The Cheeseburger Wendy's Burger is a classic fast food burger/);
  assert.match(contents, /26 mins/);
  assert.match(contents, /UIImage\(named: "star", in: Bundle\.module/);
  assert.match(contents, /Spicy/);
  assert.match(contents, /UISlider/);
  assert.match(contents, /Portion/);
  assert.match(contents, /\$8\.24/);
  assert.match(contents, /ORDER NOW/);
  assert.match(contents, /PAY NOW/);
  assert.match(contents, /Payment methods/);
  assert.match(contents, /Credit card/);
  assert.match(contents, /Debit card/);
  assert.doesNotMatch(contents, /Cash on delivery/);
  assert.doesNotMatch(contents, /Order                                      \$16\.48/);
  assert.match(contents, /title\.text = "Success !"/);
  assert.match(contents, /GO BACK/);
  assert.match(contents, /coordinator\.navigate\(to: \.home, transition: \.popUpMessageToHomeTapOk\)/);
  assert.match(contents, /\.payment, transition: \.product1ToPaymentTapCheckout/);
  assert.match(contents, /let footerGap = UIView\(\)/);
  assert.match(contents, /scroll\.bottomAnchor\.constraint\(equalTo: view\.safeAreaLayoutGuide\.bottomAnchor\)/);
});

test('UIKit generator renders filled boolean-operation bounds without guessing unstyled vectors', () => {
  const input = {
    featureName: 'Preview',
    design: {
      id: 'food', name: 'FoodApp', tokens: [], assets: [], diagnostics: [], provenance: [],
      nodes: [{ id: 'home', name: 'preview', type: 'FRAME', layout: { width: 430, height: 932 }, style: { fill: '#ffffff' }, children: [
        { id: 'bar', name: 'Subtract', type: 'VECTOR', layout: { x: 0, y: 856, width: 456, height: 90 }, style: { fill: '#ef2a39' }, children: [], unsupportedProperties: [], provenance: [] },
        { id: 'icon', name: 'heart', type: 'VECTOR', layout: { x: 10, y: 10, width: 24, height: 24 }, children: [], unsupportedProperties: [], provenance: [] },
      ], unsupportedProperties: [], provenance: [] }],
    },
    flow: { screens: [], transitions: [], diagnostics: [], conflicts: [], source: 'test' },
  } as any;
  const contents = generateUIKitViewController(input).files[0]?.contents ?? '';
  assert.match(contents, /let bar = UIView\(\)/);
  assert.match(contents, /bar\.widthAnchor\.constraint\(equalToConstant: 456\)/);
  assert.match(contents, /bar\.heightAnchor\.constraint\(equalToConstant: 90\)/);
  assert.doesNotMatch(contents, /addShape\(/);
  assert.doesNotMatch(contents, /designCanvas/);
});
