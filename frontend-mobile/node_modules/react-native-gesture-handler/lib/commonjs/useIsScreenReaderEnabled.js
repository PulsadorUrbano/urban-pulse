"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useIsScreenReaderEnabled = useIsScreenReaderEnabled;
var _react = require("react");
var _reactNative = require("react-native");
function useIsScreenReaderEnabled() {
  const [isEnabled, setIsEnabled] = (0, _react.useState)(false);
  (0, _react.useEffect)(() => {
    const checkStatus = async () => {
      try {
        const res = await _reactNative.AccessibilityInfo.isScreenReaderEnabled();
        setIsEnabled(res);
      } catch (error) {
        console.warn('Could not read accessibility info: defaulting to false');
      }
    };
    checkStatus();
    const listener = _reactNative.AccessibilityInfo.addEventListener('screenReaderChanged', enabled => {
      setIsEnabled(enabled);
    });
    return () => {
      listener.remove();
    };
  }, []);
  return isEnabled;
}
//# sourceMappingURL=useIsScreenReaderEnabled.js.map