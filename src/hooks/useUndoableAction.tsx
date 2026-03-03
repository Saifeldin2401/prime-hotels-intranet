/**
 * useUndoableAction Hook
 * 
 * A wrapper hook that makes any action undoable with a toast notification.
 * Shows an undo toast with countdown before executing the action.
 */

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useUndo } from './useUndo';
import { UndoToast } from '@/components/common/UndoToast';

export interface UseUndoableActionOptions {
  delay?: number;
  message: string;
  successMessage?: string;
  errorMessage?: string;
  onCancel?: () => void;
}

export interface UseUndoableActionReturn<T = unknown> {
  execute: (data?: T) => void;
  undo: () => void;
  reset: () => void;
  status: 'idle' | 'pending' | 'executed' | 'cancelled';
  isPending: boolean;
  timeRemaining: number;
}

/**
 * Hook that wraps an action with undo functionality.
 * Shows a toast with undo button and countdown.
 * 
 * @example
 * const markTaskComplete = async (taskId: string) => {
 *   await api.completeTask(taskId);
 * };
 * 
 * const { execute, undo, isPending } = useUndoableAction(markTaskComplete, {
 *   delay: 5000,
 *   message: 'Task will be marked complete',
 *   successMessage: 'Task completed successfully'
 * });
 * 
 * // In UI:
 * <button onClick={() => execute('task-123')}>Mark Complete</button>
 */
export function useUndoableAction<T = unknown>(
  action: (data: T) => Promise<void> | void,
  options: UseUndoableActionOptions
): UseUndoableActionReturn<T> {
  const { delay = 5000, message, successMessage, errorMessage, onCancel } = options;
  const toastIdRef = useRef<string | number | null>(null);
  const actionDataRef = useRef<T | undefined>(undefined);

  const handleExecute = useCallback(async () => {
    try {
      if (actionDataRef.current !== undefined) {
        await action(actionDataRef.current);
      }
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (error) {
      toast.error(errorMessage || 'Action failed. Please try again.');
    }
    actionDataRef.current = undefined;
  }, [action, successMessage, errorMessage]);

  const { state, queue, undo: undoBase, reset } = useUndo<T>({
    delay,
    onExecute: handleExecute,
    onCancel: () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      actionDataRef.current = undefined;
      onCancel?.();
    },
  });

  const execute = useCallback((data?: T) => {
    actionDataRef.current = data;
    queue(data);

    // Show undo toast
    toastIdRef.current = toast.custom(
      (t) => (
        <UndoToast
          message={message}
          onUndo={() => {
            undoBase();
            toast.dismiss(t);
          }}
          timeRemaining={delay}
          delay={delay}
        />
      ),
      {
        duration: delay,
        onDismiss: () => {
          // Toast dismissed naturally (timeout) - action will execute
          toastIdRef.current = null;
        },
      }
    );
  }, [queue, undoBase, message, delay]);

  const undo = useCallback(() => {
    undoBase();
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, [undoBase]);

  return {
    execute,
    undo,
    reset,
    status: state.status,
    isPending: state.status === 'pending',
    timeRemaining: state.timeRemaining,
  };
}

export default useUndoableAction;
