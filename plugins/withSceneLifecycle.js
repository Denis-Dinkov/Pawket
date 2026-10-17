// iOS 27 kills apps without the UIScene lifecycle. The Expo SDK 57 template doesn't use it yet,
// so we port the setup from the SDK 58 template: a SceneDelegate based on ExpoAppSceneDelegate,
// which creates the window and starts React Native instead of the AppDelegate.
const fs = require('fs');
const path = require('path');
const { withInfoPlist, withAppDelegate, withXcodeProject, withDangerousMod, IOSConfig } = require('expo/config-plugins');

const SCENE_DELEGATE = `internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // Extension point for config plugins.
}
`;

const withSceneManifest = (config) =>
  withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return mod;
  });

const withSceneAppDelegate = (config) =>
  withAppDelegate(config, (mod) => {
    let src = mod.modResults.contents;
    src = src.replace(
      /class AppDelegate: ExpoAppDelegate \{/,
      'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {'
    );
    // The window and the React Native startup are handled by the SceneDelegate
    src = src.replace(
      /#if os\(iOS\) \|\| os\(tvOS\)\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*factory\.startReactNative\([\s\S]*?\)\s*#endif\s*/,
      '// The window is created and React Native is started by `SceneDelegate` (iOS 27 scene life cycle).\n    '
    );
    mod.modResults.contents = src;
    return mod;
  });

const withSceneDelegateFile = (config) =>
  withDangerousMod(config, [
    'ios',
    (mod) => {
      const dir = path.join(mod.modRequest.platformProjectRoot, mod.modRequest.projectName);
      fs.writeFileSync(path.join(dir, 'SceneDelegate.swift'), SCENE_DELEGATE);
      return mod;
    },
  ]);

const withSceneDelegateInProject = (config) =>
  withXcodeProject(config, (mod) => {
    const name = mod.modRequest.projectName;
    const filepath = `${name}/SceneDelegate.swift`;
    if (!mod.modResults.hasFile(filepath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath, groupName: name, project: mod.modResults });
    }
    return mod;
  });

module.exports = (config) =>
  withSceneDelegateInProject(withSceneDelegateFile(withSceneAppDelegate(withSceneManifest(config))));
