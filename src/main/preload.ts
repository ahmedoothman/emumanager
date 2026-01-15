// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer } from 'electron';

export interface EmulatorInfo {
  name: string;
  isRunning: boolean;
}

export interface LaunchOptions {
  coldBoot?: boolean;
  wipeData?: boolean;
  noAudio?: boolean;
  gpuMode?: 'auto' | 'host' | 'swiftshader_indirect' | 'off';
  readOnly?: boolean;
}

export interface SdkStatus {
  found: boolean;
  path: string | null;
  emulatorFound: boolean;
  adbFound: boolean;
}

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

const emulatorHandler = {
  getSdkStatus: (): Promise<ApiResponse<SdkStatus>> =>
    ipcRenderer.invoke('emulator:sdk-status'),

  listEmulators: (): Promise<ApiResponse<EmulatorInfo[]>> =>
    ipcRenderer.invoke('emulator:list'),

  launchEmulator: (
    name: string,
    options?: LaunchOptions,
  ): Promise<ApiResponse> => ipcRenderer.invoke('emulator:launch', name, options),

  killEmulator: (name: string): Promise<ApiResponse> =>
    ipcRenderer.invoke('emulator:kill', name),

  launchMultiple: (
    names: string[],
    options?: LaunchOptions,
  ): Promise<ApiResponse<{ name: string; success: boolean; error?: string }[]>> =>
    ipcRenderer.invoke('emulator:launch-multiple', names, options),

  getAssetPath: (assetName: string): Promise<string> =>
    ipcRenderer.invoke('app:get-asset-path', assetName),
};

contextBridge.exposeInMainWorld('emulator', emulatorHandler);

export type EmulatorHandler = typeof emulatorHandler;
