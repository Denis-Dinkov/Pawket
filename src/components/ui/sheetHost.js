import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useSyncExternalStore } from 'react';

// iOS presents a modal only from the topmost one, and only once the one before it has gone. Waiting for a
// sheet to leave before opening a page from it (e.g. "Edit" opening the Add page) read as a slow stop-and-go.
// So such a page is presented on top of the sheet it comes from, with the same slide as from the "+",
// and the sheet stays open underneath until the page is gone.
const ROOT = 'root';
let stack = []; // the sheets on screen, the topmost last
let nextId = 1;
let onTop = { hostId: null, element: null };
const listeners = new Set();
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const publish = (next) => {
  onTop = next;
  listeners.forEach((fn) => fn());
};

/**
 * For a page Modal that may be opened while a sheet is showing (the Add page). Returns atRoot: render the
 * element yourself only then; otherwise the topmost sheet renders it inside its own presentation.
 * render({ onDismiss }) builds the Modal and passes onDismiss on to it; the place is picked when it opens
 * and kept until it is gone (onDismiss, with a timer as backup).
 */
export function useOnTop(open, render) {
  const host = useRef(null);
  const [, rerender] = useReducer((n) => n + 1, 0);
  if (open && host.current == null) host.current = stack.length ? stack[stack.length - 1] : ROOT;
  const release = useCallback(() => {
    if (host.current == null) return;
    host.current = null;
    if (onTop.hostId) publish({ hostId: null, element: null });
    rerender();
  }, []);
  const element = render({ onDismiss: release });
  const hostId = host.current && host.current !== ROOT ? host.current : null;
  useLayoutEffect(() => {
    if (hostId || onTop.hostId) publish({ hostId, element: hostId ? element : null });
  });
  useEffect(() => {
    if (open || host.current == null) return undefined;
    // Long enough for the page's own slide down: released earlier, the sheet would take it down mid-way
    const timer = setTimeout(release, 1200);
    return () => clearTimeout(timer);
  }, [open, release]);
  return { atRoot: !hostId, element };
}

/**
 * A sheet's place on the stack: enter() when it starts showing, leave() once it is really gone.
 * hosted is the page opened from it (see useOnTop), which the sheet renders inside its presentation.
 */
export function useSheetEntry() {
  const id = useRef(0);
  if (!id.current) id.current = nextId++;
  const hosted = useSyncExternalStore(subscribe, () => (onTop.hostId === id.current ? onTop.element : null));
  const entered = useRef(false);
  const enter = useCallback(() => {
    if (entered.current) return;
    entered.current = true;
    stack.push(id.current);
  }, []);
  const leave = useCallback(() => {
    if (!entered.current) return;
    entered.current = false;
    stack = stack.filter((x) => x !== id.current);
  }, []);
  useEffect(() => leave, [leave]);
  return { hosted, enter, leave };
}
