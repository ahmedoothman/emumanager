import { ipcMain, app } from 'electron';
import path from 'path';
import {
  listEmulators,
  launchEmulator,
  killEmulator,
  checkSdkStatus,
  LaunchOptions,
} from './emulatorService';

const getResourcesPath = (): string => {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');
};

export function registerIpcHandlers(): void {
  ipcMain.handle('emulator:sdk-status', async () => {
    try {
      return { success: true, data: checkSdkStatus() };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('emulator:list', async () => {
    try {
      const emulators = await listEmulators();
      return { success: true, data: emulators };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle(
    'emulator:launch',
    async (_, name: string, options: LaunchOptions = {}) => {
      try {
        await launchEmulator(name, options);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  ipcMain.handle('emulator:kill', async (_, name: string) => {
    try {
      await killEmulator(name);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle(
    'emulator:launch-multiple',
    async (_, names: string[], options: LaunchOptions = {}) => {
      const results: { name: string; success: boolean; error?: string }[] = [];

      for (const name of names) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await launchEmulator(name, options);
          results.push({ name, success: true });
        } catch (error) {
          results.push({
            name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return { success: true, data: results };
    },
  );

  ipcMain.handle('app:get-asset-path', (_, assetName: string) => {
    const resourcesPath = getResourcesPath();
    return `file://${path.join(resourcesPath, assetName).replace(/\\/g, '/')}`;
  });
}
