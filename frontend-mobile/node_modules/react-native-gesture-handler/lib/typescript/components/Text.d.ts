import React, { ComponentRef, Ref } from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
type TextProps = RNTextProps & {
    ref?: Ref<ComponentRef<typeof RNText> | null>;
};
export declare const Text: (props: TextProps) => React.JSX.Element;
export type Text = typeof Text & RNText;
export {};
//# sourceMappingURL=Text.d.ts.map