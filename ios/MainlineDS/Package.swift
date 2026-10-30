// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MainlineDS",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "MainlineDS", targets: ["MainlineDS"])
    ],
    targets: [
        .target(name: "MainlineDS"),
        .testTarget(name: "MainlineDSTests", dependencies: ["MainlineDS"]),
    ]
)
