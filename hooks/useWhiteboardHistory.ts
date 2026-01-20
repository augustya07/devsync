// useWhiteboardHistory - Undo/Redo stack management
// Staff engineer architecture: Encapsulated history logic, testable, with keyboard shortcuts

import { useCallback, useEffect, useRef, useState } from 'react';
import { WhiteboardElement } from '@/lib/whiteboard/types';
import { HISTORY } from '@/lib/whiteboard/constants';

interface HistoryState {
    past: WhiteboardElement[][];
    present: WhiteboardElement[];
    future: WhiteboardElement[][];
}

interface UseWhiteboardHistoryReturn {
    elements: WhiteboardElement[];
    setElements: (elements: WhiteboardElement[]) => void;
    push: (elements: WhiteboardElement[]) => void;
    undo: () => void;
    redo: () => void;
    clear: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export function useWhiteboardHistory(
    initialElements: WhiteboardElement[] = [],
    maxSize: number = HISTORY.maxSize,
    onSync?: (elements: WhiteboardElement[], action: 'add' | 'clear') => void
): UseWhiteboardHistoryReturn {
    const [state, setState] = useState<HistoryState>({
        past: [],
        present: initialElements,
        future: [],
    });

    // Keep ref in sync for keyboard handler
    const stateRef = useRef(state);
    stateRef.current = state;

    // Sync with external elements (from other participants)
    const setElements = useCallback((elements: WhiteboardElement[]) => {
        setState(prev => ({
            past: prev.past,
            present: elements,
            future: [],
        }));
    }, []);

    // Push a new state (for local changes)
    const push = useCallback((newElements: WhiteboardElement[]) => {
        setState(prev => {
            const newPast = [...prev.past, prev.present];
            // Limit history size
            if (newPast.length > maxSize) {
                newPast.shift();
            }
            return {
                past: newPast,
                present: newElements,
                future: [], // Clear future on new action
            };
        });
    }, [maxSize]);

    // Undo last action
    const undo = useCallback(() => {
        setState(prev => {
            if (prev.past.length === 0) return prev;

            const newPast = [...prev.past];
            const previous = newPast.pop()!;

            return {
                past: newPast,
                present: previous,
                future: [prev.present, ...prev.future],
            };
        });
    }, []);

    // Redo last undone action
    const redo = useCallback(() => {
        setState(prev => {
            if (prev.future.length === 0) return prev;

            const newFuture = [...prev.future];
            const next = newFuture.shift()!;

            return {
                past: [...prev.past, prev.present],
                present: next,
                future: newFuture,
            };
        });
    }, []);

    // Clear all elements
    const clear = useCallback(() => {
        setState(prev => ({
            past: [...prev.past, prev.present],
            present: [],
            future: [],
        }));
        onSync?.([], 'clear');
    }, [onSync]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if we're in an input field
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    return {
        elements: state.present,
        setElements,
        push,
        undo,
        redo,
        clear,
        canUndo: state.past.length > 0,
        canRedo: state.future.length > 0,
    };
}
