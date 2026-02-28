import { useState, useCallback, useRef, useEffect } from 'react';

export interface UndoState<T = unknown> {
  status: 'idle' | 'pending' | 'executed' | 'cancelled';
  data: T | null;
  timeRemaining: number;
}

export interface UseUndoOptions {
  delay?: number;
  onExecute?: () => void;
  onCancel?: () => void;
}

export interface UseUndoReturn<T = unknown> {
  state: UndoState<T>;
  queue: (data?: T) => void;
  undo: () => void;
  reset: () => void;
}

/**
 * Hook that manages undo state with a delayed execution.
 * 
 * @example
 * const { state, queue, undo, reset } = useUndo<string>({
 *   delay: 5000,
 *   onExecute: () => console.log('Action executed!'),
 *   onCancel: () => console.log('Action cancelled!')
 * });
 * 
 * // Queue an action
 * queue('task-123');
 * 
 * // Cancel within 5 seconds
 * undo();
 */
export function useUndo<T = unknown>(options: UseUndoOptions = {}): UseUndoReturn<T> {
  const { delay = 5000, onExecute, onCancel } = options;
  
  const [state, setState] = useState<UndoState<T>>({
    status: 'idle',
    data: null,
    timeRemaining: delay,
  });
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  
  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
  
  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  const queue = useCallback((data?: T) => {
    // Clear any existing timers
    clearTimers();
    
    startTimeRef.current = Date.now();
    
    setState({
      status: 'pending',
      data: data ?? null,
      timeRemaining: delay,
    });
    
    // Set up countdown interval
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, delay - elapsed);
      
      setState(prev => ({
        ...prev,
        timeRemaining: remaining,
      }));
      
      if (remaining <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
      }
    }, 100);
    
    // Set up execution timeout
    timeoutRef.current = setTimeout(() => {
      clearTimers();
      setState(prev => ({
        ...prev,
        status: 'executed',
        timeRemaining: 0,
      }));
      onExecute?.();
    }, delay);
  }, [delay, clearTimers, onExecute]);
  
  const undo = useCallback(() => {
    clearTimers();
    setState({
      status: 'cancelled',
      data: null,
      timeRemaining: 0,
    });
    onCancel?.();
  }, [clearTimers, onCancel]);
  
  const reset = useCallback(() => {
    clearTimers();
    setState({
      status: 'idle',
      data: null,
      timeRemaining: delay,
    });
  }, [clearTimers, delay]);
  
  return {
    state,
    queue,
    undo,
    reset,
  };
}

export default useUndo;
