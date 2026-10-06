function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
import React, { useCallback } from 'react';
import StackHeaderItemIOSNativeComponent from '../../../../../fabric/gamma/stack/StackHeaderItemIOSNativeComponent';
import { StyleSheet } from 'react-native';
export default function StackHeaderItem(props) {
  const {
    render,
    onPress,
    ...rest
  } = props;

  // `rest.menu` includes some JS callback within nested menu specification
  // codegen strips JS functions and replaces them with NULLT and keys of such type
  // are omitted inside RNSConvertFollyDynamicToId so we can safely pass `rest.menu` as-is

  const handlePress = useCallback(_event => {
    onPress?.();
  }, [onPress]);
  return /*#__PURE__*/React.createElement(StackHeaderItemIOSNativeComponent, _extends({}, rest, {
    // We need to tell iOS that we want the handler to be attached only when we actually require it
    // because doing so makes the menu appear on long press instead of tap
    respondsToOnPress: !!onPress,
    onHeaderItemPress: handlePress,
    style: styles.config
  }), render?.());
}
const styles = StyleSheet.create({
  config: {
    position: 'absolute',
    left: 0,
    top: 0
  }
});
//# sourceMappingURL=StackHeaderItem.ios.js.map