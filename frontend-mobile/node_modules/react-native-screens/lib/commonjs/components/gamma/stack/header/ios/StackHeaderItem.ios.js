"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = StackHeaderItem;
var _react = _interopRequireWildcard(require("react"));
var _StackHeaderItemIOSNativeComponent = _interopRequireDefault(require("../../../../../fabric/gamma/stack/StackHeaderItemIOSNativeComponent"));
var _reactNative = require("react-native");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function StackHeaderItem(props) {
  const {
    render,
    onPress,
    ...rest
  } = props;

  // `rest.menu` includes some JS callback within nested menu specification
  // codegen strips JS functions and replaces them with NULLT and keys of such type
  // are omitted inside RNSConvertFollyDynamicToId so we can safely pass `rest.menu` as-is

  const handlePress = (0, _react.useCallback)(_event => {
    onPress?.();
  }, [onPress]);
  return /*#__PURE__*/_react.default.createElement(_StackHeaderItemIOSNativeComponent.default, _extends({}, rest, {
    // We need to tell iOS that we want the handler to be attached only when we actually require it
    // because doing so makes the menu appear on long press instead of tap
    respondsToOnPress: !!onPress,
    onHeaderItemPress: handlePress,
    style: styles.config
  }), render?.());
}
const styles = _reactNative.StyleSheet.create({
  config: {
    position: 'absolute',
    left: 0,
    top: 0
  }
});
//# sourceMappingURL=StackHeaderItem.ios.js.map