"use strict";

import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, Text as RNText } from 'react-native';
import { GestureObjects as Gesture } from '../handlers/gestures/gestureObjects';
import { GestureDetector } from '../handlers/gestures/GestureDetector';
import { jsx as _jsx } from "react/jsx-runtime";
export const Text = props => {
  const {
    onPress,
    onLongPress,
    ref,
    ...rest
  } = props;
  const textRef = useRef(null);
  const native = useMemo(() => Gesture.Native().runOnJS(true), []);
  const refHandler = useMemo(() => {
    const handler = node => {
      textRef.current = node;
      if (!ref) {
        return;
      }
      if (typeof ref === 'function') {
        ref(node);
      } else {
        ref.current = node;
      }
    };

    // This is a special case for `Text` component. After https://github.com/software-mansion/react-native-gesture-handler/pull/3379 we check for
    // `displayName` field. However, `Text` from RN has this field set to `Text`, but is also present in `RNSVGElements` set.
    // We don't want to treat our `Text` as the one from `SVG`, therefore we add special field to ref.
    handler.rngh = true;
    return handler;
  }, [ref]);
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    // At this point we are sure that textElement is div in HTML tree
    textRef.current?.setAttribute('rnghtext', 'true');
  }, []);
  return onPress || onLongPress ? /*#__PURE__*/_jsx(GestureDetector, {
    gesture: native,
    children: /*#__PURE__*/_jsx(RNText, {
      onPress: onPress,
      onLongPress: onLongPress,
      ref: refHandler,
      ...rest
    })
  }) : /*#__PURE__*/_jsx(RNText, {
    ref: refHandler,
    ...rest
  });
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
//# sourceMappingURL=Text.js.map