import XCTest

final class SwiftUIRouteUITests: XCTestCase {
    func testCatalogToSwiftUIGeneratedScreen() {
        let app = XCUIApplication(bundleIdentifier: "com.openpencil.inspector.swiftui-demo")
        app.launch()

        let renderer = app.buttons["renderer.swiftui"]
        XCTAssertTrue(renderer.waitForExistence(timeout: 5))
        renderer.tap()

        XCTAssertTrue(app.staticTexts["Ouch! Hungry"].waitForExistence(timeout: 5))
    }

    func testFoodDetailsToPaymentAddressRoute() {
        let app = XCUIApplication(bundleIdentifier: "com.openpencil.inspector.swiftui-demo")
        app.launchArguments = ["-openFoodDetails"]
        app.launch()

        let orderNow = app.buttons["0:536"]
        XCTAssertTrue(orderNow.waitForExistence(timeout: 5))
        orderNow.tap()

        XCTAssertTrue(app.otherElements["0:560"].waitForExistence(timeout: 5))
    }
}
