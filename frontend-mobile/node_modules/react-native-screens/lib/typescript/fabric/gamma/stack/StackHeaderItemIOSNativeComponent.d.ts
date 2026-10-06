import type { CodegenTypes as CT, ViewProps } from 'react-native';
import { UnsafeMixed } from '../../codegenUtils';
export type Placement = 'leading' | 'trailing' | 'title' | 'subtitle' | 'largeSubtitle';
export type StackHeaderMenuItemIOS = {
    id: string;
    type: 'menuItem';
    title?: string | undefined;
    keepsMenuPresented?: boolean | undefined;
};
export type StackHeaderMenuIOS = {
    id: string;
    type: 'menu';
    title?: string | undefined;
    children: StackHeaderMenuElementIOS[];
};
export type StackHeaderMenuElementIOS = StackHeaderMenuItemIOS | StackHeaderMenuIOS;
export type HeaderItemPressEvent = Readonly<{}>;
export interface NativeProps extends ViewProps {
    placement?: CT.WithDefault<Placement, 'trailing'>;
    itemId?: string | undefined;
    title?: string | undefined;
    menu?: UnsafeMixed<StackHeaderMenuIOS> | undefined;
    respondsToOnPress?: CT.WithDefault<boolean, false>;
    onHeaderItemPress?: CT.DirectEventHandler<HeaderItemPressEvent> | undefined;
}
declare const _default: import("react-native").HostComponent<NativeProps>;
export default _default;
//# sourceMappingURL=StackHeaderItemIOSNativeComponent.d.ts.map