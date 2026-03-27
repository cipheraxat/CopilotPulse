import { useEffect, useCallback, useRef } from 'react';
import { getVsCodeApi } from '../utilities/vscode';
import type { MessageToExtension, MessageToWebview } from '../../../src/models/types';

export function isValidMessage(data: unknown): data is MessageToWebview {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    typeof (data as Record<string, unknown>).type === 'string'
  );
}

/**
 * Hook to send messages to the extension host.
 */
export function useVsCode() {
  const api = getVsCodeApi();
  const send = useCallback((message: MessageToExtension) => {
    api.postMessage(message);
  }, [api]);

  return { send, api };
}

/**
 * Hook to listen for messages from the extension host.
 */
export function useExtensionMessage(callback: (message: MessageToWebview) => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const api = getVsCodeApi();
    const unsubscribe = api.onMessage((msg) => {
      if (isValidMessage(msg)) {
        callbackRef.current(msg);
      }
    });
    return unsubscribe;
  }, []);
}
