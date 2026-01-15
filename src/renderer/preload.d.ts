import { EmulatorHandler } from '../main/preload';

declare global {
  interface Window {
    emulator: EmulatorHandler;
  }
}

export {};
