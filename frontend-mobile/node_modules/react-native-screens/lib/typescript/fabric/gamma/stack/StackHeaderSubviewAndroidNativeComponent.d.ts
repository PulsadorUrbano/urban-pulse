import type { CodegenTypes as CT, ViewProps } from 'react-native';
type StackHeaderSubviewTypeAndroid = 'background' | 'leading' | 'center' | 'trailing';
type StackHeaderSubviewBackgroundCollapseModeAndroid = 'off' | 'parallax';
export interface NativeProps extends ViewProps {
    type?: CT.WithDefault<StackHeaderSubviewTypeAndroid, 'leading'>;
    collapseMode?: CT.WithDefault<StackHeaderSubviewBackgroundCollapseModeAndroid, 'off'>;
}
declare const _default: import("react-native").HostComponent<NativeProps>;
export default _default;
//# sourceMappingURL=StackHeaderSubviewAndroidNativeComponent.d.ts.map