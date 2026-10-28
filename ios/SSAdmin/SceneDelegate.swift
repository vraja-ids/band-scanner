import Expo
import React
import ReactAppDependencyProvider
import UIKit

/// UIScene lifecycle delegate — required for iOS 26+/27 (apps without scene
/// adoption crash at launch on iOS 27).
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate
    else {
      return
    }

    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    appDelegate.reactNativeDelegate = delegate
    appDelegate.reactNativeFactory = factory
    appDelegate.bindReactNativeFactory(factory)

    window = UIWindow(windowScene: windowScene)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: appDelegate.launchOptions)
  }
}
