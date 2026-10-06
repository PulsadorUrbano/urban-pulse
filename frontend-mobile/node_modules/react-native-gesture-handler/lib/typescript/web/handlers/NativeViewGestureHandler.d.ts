import { AdaptedEvent, Config } from '../interfaces';
import GestureHandler from './GestureHandler';
import IGestureHandler from './IGestureHandler';
export default class NativeViewGestureHandler extends GestureHandler {
    private buttonRole;
    private shouldActivateOnStart;
    private disallowInterruption;
    private startX;
    private startY;
    private minDistSq;
    init(ref: number, propsRef: React.RefObject<unknown>): void;
    updateGestureConfig({ enabled, ...props }: Config): void;
    private restoreViewStyles;
    protected onPointerDown(event: AdaptedEvent): void;
    protected onPointerAdd(event: AdaptedEvent): void;
    private newPointerAction;
    protected onPointerMove(event: AdaptedEvent): void;
    protected onPointerLeave(): void;
    protected onPointerUp(event: AdaptedEvent): void;
    protected onPointerRemove(event: AdaptedEvent): void;
    private onUp;
    shouldRecognizeSimultaneously(handler: IGestureHandler): boolean;
    shouldBeCancelledByOther(_handler: IGestureHandler): boolean;
    disallowsInterruption(): boolean;
    isButton(): boolean;
}
//# sourceMappingURL=NativeViewGestureHandler.d.ts.map