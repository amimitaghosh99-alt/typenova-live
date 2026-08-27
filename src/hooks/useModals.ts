import { useCallback, useMemo, useReducer } from 'react';
import type { ModalKey, ModalState } from '@/lib/layout';

/**
 * The dialog layer's navigation state.
 *
 * Replaces a `useState<ModalType>` plus nine `setShowX(boolean)` wrappers plus
 * a `previousModalRef`. Three problems came out of that shape:
 *
 * 1. `setShowX(false)` closed whatever happened to be open, not `X`. A stale
 *    "hide the social modal" call could therefore dismiss an unrelated dialog.
 * 2. The "go back to the modal I came from" hop was implemented by writing a
 *    ref from inside a `setState` updater. Updaters must be pure — React is
 *    free to call them more than once — and `App.tsx` had to disable
 *    `react-hooks/purity` for the file.
 * 3. The ref was only maintained on one of the two paths that open a profile,
 *    so it could still hold a value from an earlier trip. Closing a profile
 *    opened from the leaderboard would then pop open whatever that stale value
 *    pointed at.
 *
 * There is no nesting left to model. The one nested case the app had was a
 * player profile opened from another dialog, and the profile is a route now
 * (`/operator/:username`) — so "go back" is the browser's job, not this
 * reducer's. `openNested` and its `returnTo` slot are gone with it.
 */
interface ModalNav {
    /** The dialog on screen, or `null` when the layer is empty. */
    active: ModalState;
}

type ModalAction =
    | { type: 'open'; key: ModalKey }
    | { type: 'close' };

const EMPTY: ModalNav = { active: null };

const reduce = (state: ModalNav, action: ModalAction): ModalNav => {
    switch (action.type) {
        case 'open':
            if (state.active === action.key) return state;
            return { active: action.key };

        case 'close':
            if (state.active === null) return state;
            return EMPTY;
    }
};

export interface UseModalsResult extends ModalNav {
    /** Show `key`. */
    open: (key: ModalKey) => void;
    /** Dismiss the current dialog. */
    close: () => void;
}

export const useModals = (): UseModalsResult => {
    const [state, dispatch] = useReducer(reduce, EMPTY);

    // `dispatch` is stable for the life of the component, so both of these are
    // too — consumers can list them in a dependency array without the effect
    // re-firing on every keystroke.
    const open = useCallback((key: ModalKey) => dispatch({ type: 'open', key }), []);
    const close = useCallback(() => dispatch({ type: 'close' }), []);

    return useMemo(
        () => ({ active: state.active, open, close }),
        [state.active, open, close],
    );
};
