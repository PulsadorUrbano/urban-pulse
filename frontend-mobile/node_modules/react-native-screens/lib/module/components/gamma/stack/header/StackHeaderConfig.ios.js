function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
import React, { useCallback, useEffect } from 'react';
import StackHeaderConfigIOSNativeComponent from '../../../../fabric/gamma/stack/StackHeaderConfigIOSNativeComponent';
import StackHeaderItemSpacer from './ios/StackHeaderItemSpacer.ios';
import StackHeaderItem from './ios/StackHeaderItem.ios';
import { StyleSheet } from 'react-native';
import { findMenuElementByIdInItems, validateMenuCallbacks } from './utils';

/**
 * EXPERIMENTAL API, MIGHT CHANGE W/O ANY NOTICE
 */
export default function StackHeaderConfig(props) {
  // android props are safely dropped
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {
    ios,
    android,
    ...restProps
  } = props;
  const {
    leadingItems,
    trailingItems,
    titleItem,
    subtitleItem,
    largeSubtitleItem,
    largeTitle,
    largeSubtitle,
    largeTitleEnabled
  } = ios ?? {};
  const handleMenuItemPress = useCallback(event => {
    const items = Array.of(...(leadingItems ?? []).filter(it => it && it.type === 'item'), ...(trailingItems ?? []).filter(it => it && it.type === 'item'));
    const menuElement = findMenuElementByIdInItems(items, event.nativeEvent.menuItemId);
    if (menuElement && menuElement.type === 'menuItem') {
      menuElement.onPress?.();
    }
  }, [leadingItems, trailingItems]);
  const allMenuItems = [...(leadingItems ?? []), ...(trailingItems ?? [])].filter(it => it && it.type === 'item');
  const handleSelectionChange = useCallback(event => {
    const {
      menuId,
      selectedMenuItemIds
    } = event.nativeEvent;
    const menu = findMenuElementByIdInItems(allMenuItems, menuId);
    if (menu && menu.type === 'menu') {
      menu.onSelectionChange?.(selectedMenuItemIds);
    }
  }, [allMenuItems]);
  useEffect(() => {
    for (const item of allMenuItems) {
      if ('menu' in item && item.menu) {
        validateMenuCallbacks(item.menu);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadingItems, trailingItems]);
  return /*#__PURE__*/React.createElement(StackHeaderConfigIOSNativeComponent, _extends({}, restProps, {
    collapsable: false,
    largeTitle: largeTitle,
    largeSubtitle: largeSubtitle,
    largeTitleEnabled: !!largeTitleEnabled,
    style: styles.config,
    onMenuItemPress: handleMenuItemPress,
    onMenuSelectionChange: handleSelectionChange
  }), leadingItems?.map(item => makeItemViewFromItem(item, 'leading')), titleItem && makeItemViewFromItem(titleItem, 'title'), subtitleItem && makeItemViewFromItem(subtitleItem, 'subtitle'), largeSubtitleItem && makeItemViewFromItem(largeSubtitleItem, 'largeSubtitle'), trailingItems?.map(item => makeItemViewFromItem(item, 'trailing')));
}
function makeItemViewFromItem(item, placement) {
  if ('type' in item && item.type === 'spacer') {
    const {
      id,
      ...rest
    } = item;
    if (!(placement === 'leading' || placement === 'trailing')) {
      console.warn(`[Stack] Invalid placement for spacer: "${placement}", defaulting to "trailing"`);
      placement = 'trailing';
    }
    return /*#__PURE__*/React.createElement(StackHeaderItemSpacer, _extends({
      key: id,
      placement: placement
    }, rest));
  }
  const {
    id,
    ...rest
  } = item;
  return /*#__PURE__*/React.createElement(StackHeaderItem, _extends({
    key: id,
    itemId: id,
    placement: placement
  }, rest));
}
const styles = StyleSheet.create({
  config: {
    position: 'absolute',
    left: 0,
    top: 0
  }
});
//# sourceMappingURL=StackHeaderConfig.ios.js.map