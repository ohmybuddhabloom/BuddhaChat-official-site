import { createContext, useContext, useEffect, useRef, useState, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

export type FlowScreen = { id: string; headerHeight?: number; header?: () => ReactNode; render: () => ReactNode };
type Controls = { current: FlowScreen; canGoBack: boolean; push(screen: FlowScreen): void; replace(screen: FlowScreen): void; pop(): void };
const Context = createContext<Controls | null>(null);
export function useFlow() { const flow = useContext(Context); if (!flow) throw new Error('Missing public navigation'); return flow; }
const blur = () => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); };

export function FlowStack({ initial }: { initial: FlowScreen }) {
  const [stack, setStack] = useState([initial]);
  const entries = useRef([initial]);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const session = useRef(crypto.randomUUID());
  useEffect(() => {
    history.replaceState({ mastersSession: session.current, mastersIndex: 0 }, '', location.href);
    const onPop = (event: PopStateEvent) => {
      const next = event.state?.mastersIndex;
      if (event.state?.mastersSession !== session.current || !Number.isInteger(next) || !entries.current[next]) {
        location.reload(); return;
      }
      blur(); indexRef.current = next; setIndex(next); setStack(entries.current.slice(0, next + 1));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const change = (screen: FlowScreen, replace: boolean) => {
    blur();
    const next = replace ? indexRef.current : indexRef.current + 1;
    entries.current = replace ? entries.current.map((entry, i) => i === next ? screen : entry) : [...entries.current.slice(0, next), screen];
    const url = new URL(location.href); url.search = ''; url.searchParams.set('content', screen.id); url.hash = '';
    history[replace ? 'replaceState' : 'pushState']({ mastersSession: session.current, mastersIndex: next }, '', url);
    indexRef.current = next; setIndex(next); setStack(entries.current.slice(0, next + 1));
  };
  const current = stack[index];
  const controls: Controls = { current, canGoBack: index > 0, push: screen => change(screen, false), replace: screen => change(screen, true), pop: () => { blur(); if (indexRef.current > 0) history.back(); } };
  return <Context.Provider value={controls}><div className="public-flow"><div className="public-header" key={current.id}>{current.header?.()}</div>{stack.map((screen, i) => <div className="public-page" key={`${i}:${screen.id}`} hidden={i !== index}>{screen.render()}</div>)}</div></Context.Provider>;
}

export function MobileScroll(props: HTMLAttributes<HTMLDivElement>) { return <div {...props} data-testid="mobile-scroll" />; }
export function KeyboardInput(props: InputHTMLAttributes<HTMLInputElement>) { return <input {...props} />; }
export function BottomSheet({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange(open: boolean): void; title: string; description?: string; children: ReactNode }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="public-overlay"/><Dialog.Content className="public-sheet"><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description}</Dialog.Description>{children}<Dialog.Close className="public-sheet-close" aria-label="关闭">×</Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
