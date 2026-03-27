import type { MessageToExtension, MessageToWebview } from '../../../src/models/types';

interface VsCodeApi {
  postMessage(message: MessageToExtension): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

class VsCodeWrapper {
  private readonly vsCodeApi: VsCodeApi;

  constructor() {
    this.vsCodeApi = acquireVsCodeApi();
  }

  public postMessage(message: MessageToExtension): void {
    this.vsCodeApi.postMessage(message);
  }

  public getState<T>(): T | undefined {
    return this.vsCodeApi.getState() as T | undefined;
  }

  public setState<T>(state: T): void {
    this.vsCodeApi.setState(state);
  }

  public onMessage(callback: (message: MessageToWebview) => void): () => void {
    const handler = (event: MessageEvent<MessageToWebview>) => {
      callback(event.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }
}

// Singleton
let instance: VsCodeWrapper | undefined;

export function getVsCodeApi(): VsCodeWrapper {
  if (!instance) {
    instance = new VsCodeWrapper();
  }
  return instance;
}
