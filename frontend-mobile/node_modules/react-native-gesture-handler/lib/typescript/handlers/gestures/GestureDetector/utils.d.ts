import { GestureRef, GestureType } from '../gesture';
import { WebEventHandler } from './types';
export declare const ALLOWED_PROPS: string[];
export declare function extractGestureRelations(gesture: GestureType): {
    waitFor: GestureRef[];
    simultaneousHandlers: GestureRef[];
    blocksHandlers: GestureRef[];
};
export declare function checkGestureCallbacksForWorklets(gesture: GestureType): void;
export declare function useForceRender(): () => void;
export declare function useWebEventHandlers(): import("react").RefObject<WebEventHandler>;
//# sourceMappingURL=utils.d.ts.map