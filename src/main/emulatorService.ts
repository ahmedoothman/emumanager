/* eslint-disable no-console */
import { exec, spawn, ChildProcess } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

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

// Store running emulator processes
const runningProcesses: Map<string, ChildProcess> = new Map();

/**
 * Get the Android SDK path based on the OS
 */
export function getAndroidSdkPath(): string | null {
  // Check ANDROID_HOME first (most common)
  let sdkPath = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;

  if (sdkPath && fs.existsSync(sdkPath)) {
    return sdkPath;
  }

  // Check common default locations
  const platform = os.platform();
  const home = os.homedir();

  const defaultPaths: string[] = [];

  if (platform === 'win32') {
    defaultPaths.push(
      path.join(home, 'AppData', 'Local', 'Android', 'Sdk'),
      'C:\\Android\\sdk',
      path.join(home, 'Android', 'Sdk'),
    );
  } else if (platform === 'darwin') {
    defaultPaths.push(
      path.join(home, 'Library', 'Android', 'sdk'),
      '/usr/local/share/android-sdk',
    );
  } else {
    // Linux
    defaultPaths.push(
      path.join(home, 'Android', 'Sdk'),
      '/opt/android-sdk',
      '/usr/local/android-sdk',
    );
  }

  for (const p of defaultPaths) {
    if (fs.existsSync(p)) {
      sdkPath = p;
      break;
    }
  }

  return sdkPath || null;
}

/**
 * Get the emulator binary path
 */
export function getEmulatorBinaryPath(sdkPath: string): string {
  const platform = os.platform();
  const emulatorDir = path.join(sdkPath, 'emulator');
  const binaryName = platform === 'win32' ? 'emulator.exe' : 'emulator';
  return path.join(emulatorDir, binaryName);
}

/**
 * List all available AVDs (Android Virtual Devices)
 */
export async function listEmulators(): Promise<EmulatorInfo[]> {
  const sdkPath = getAndroidSdkPath();

  if (!sdkPath) {
    throw new Error('Android SDK not found. Please set ANDROID_HOME environment variable.');
  }

  const emulatorBinary = getEmulatorBinaryPath(sdkPath);

  if (!fs.existsSync(emulatorBinary)) {
    throw new Error(`Emulator binary not found at: ${emulatorBinary}`);
  }

  return new Promise((resolve, reject) => {
    exec(`"${emulatorBinary}" -list-avds`, (error, stdout, stderr) => {
      if (error) {
        console.error('Error listing emulators:', stderr);
        reject(new Error(`Failed to list emulators: ${stderr || error.message}`));
        return;
      }

      const emulatorNames = stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .filter((line) => !line.startsWith('INFO'))
        .filter((line) => !line.includes('|'))
        .filter((line) => !line.startsWith('WARNING'))
        .filter((line) => !line.startsWith('ERROR'));

      // Get running emulators to mark status
      getRunningEmulators()
        .then((runningNames) => {
          const emulators: EmulatorInfo[] = emulatorNames.map((name) => ({
            name,
            isRunning: runningNames.includes(name) || runningProcesses.has(name),
          }));
          resolve(emulators);
        })
        .catch(() => {
          // If we can't get running emulators, just return all as not running
          const emulators: EmulatorInfo[] = emulatorNames.map((name) => ({
            name,
            isRunning: runningProcesses.has(name),
          }));
          resolve(emulators);
        });
    });
  });
}

/**
 * Get list of currently running emulators using ADB
 */
export async function getRunningEmulators(): Promise<string[]> {
  const sdkPath = getAndroidSdkPath();

  if (!sdkPath) {
    return [];
  }

  const platform = os.platform();
  const adbDir = path.join(sdkPath, 'platform-tools');
  const adbBinary = platform === 'win32' ? 'adb.exe' : 'adb';
  const adbPath = path.join(adbDir, adbBinary);

  if (!fs.existsSync(adbPath)) {
    return [];
  }

  return new Promise((resolve) => {
    exec(`"${adbPath}" devices`, (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }

      const lines = stdout.split('\n');
      const runningEmulators: string[] = [];

      for (const line of lines) {
        // Look for emulator entries like "emulator-5554	device"
        const match = line.match(/emulator-\d+\s+device/);
        if (match) {
          // We'd need to map port to AVD name, for now just track by process
          runningEmulators.push(line.split('\t')[0]);
        }
      }

      resolve(runningEmulators);
    });
  });
}

/**
 * Launch an emulator with specified options
 */
export async function launchEmulator(
  name: string,
  options: LaunchOptions = {},
): Promise<void> {
  const sdkPath = getAndroidSdkPath();

  if (!sdkPath) {
    throw new Error('Android SDK not found. Please set ANDROID_HOME environment variable.');
  }

  const emulatorBinary = getEmulatorBinaryPath(sdkPath);

  if (!fs.existsSync(emulatorBinary)) {
    throw new Error(`Emulator binary not found at: ${emulatorBinary}`);
  }

  // Build command arguments
  const args: string[] = ['-avd', name];

  if (options.coldBoot) {
    args.push('-no-snapshot-load');
  }

  if (options.wipeData) {
    args.push('-wipe-data');
  }

  if (options.noAudio) {
    args.push('-no-audio');
  }

  if (options.gpuMode) {
    args.push('-gpu', options.gpuMode);
  }

  if (options.readOnly) {
    args.push('-read-only');
  }

  return new Promise((resolve, reject) => {
    console.log(`Launching emulator: ${emulatorBinary} ${args.join(' ')}`);

    try {
      const child = spawn(emulatorBinary, args, {
        detached: true,
        stdio: 'ignore',
      });

      child.unref();

      // Store the process reference
      runningProcesses.set(name, child);

      child.on('error', (err) => {
        console.error(`Failed to start emulator ${name}:`, err);
        runningProcesses.delete(name);
        reject(new Error(`Failed to start emulator: ${err.message}`));
      });

      child.on('exit', (code) => {
        console.log(`Emulator ${name} exited with code ${code}`);
        runningProcesses.delete(name);
      });

      // Give it a moment to start
      setTimeout(() => {
        resolve();
      }, 1000);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Kill a running emulator
 */
export async function killEmulator(name: string): Promise<void> {
  const sdkPath = getAndroidSdkPath();

  if (!sdkPath) {
    throw new Error('Android SDK not found');
  }

  const platform = os.platform();
  const adbDir = path.join(sdkPath, 'platform-tools');
  const adbBinary = platform === 'win32' ? 'adb.exe' : 'adb';
  const adbPath = path.join(adbDir, adbBinary);

  // First try to kill via our stored process
  const storedProcess = runningProcesses.get(name);
  if (storedProcess) {
    try {
      storedProcess.kill();
      runningProcesses.delete(name);
      return;
    } catch {
      // Continue to ADB method
    }
  }

  // Try to kill via ADB
  if (fs.existsSync(adbPath)) {
    return new Promise((resolve, reject) => {
      // First get the list of emulators and their ports
      exec(`"${adbPath}" devices`, (error, stdout) => {
        if (error) {
          reject(new Error('Failed to get device list'));
          return;
        }

        const lines = stdout.split('\n');
        for (const line of lines) {
          const match = line.match(/emulator-(\d+)\s+device/);
          if (match) {
            const port = match[1];
            // Send kill command to this emulator
            exec(`"${adbPath}" -s emulator-${port} emu kill`, (killError) => {
              if (killError) {
                console.error('Error killing emulator:', killError);
              }
            });
          }
        }

        runningProcesses.delete(name);
        resolve();
      });
    });
  }

  runningProcesses.delete(name);
}

/**
 * Check if SDK is properly configured
 */
export function checkSdkStatus(): {
  found: boolean;
  path: string | null;
  emulatorFound: boolean;
  adbFound: boolean;
} {
  const sdkPath = getAndroidSdkPath();

  if (!sdkPath) {
    return {
      found: false,
      path: null,
      emulatorFound: false,
      adbFound: false,
    };
  }

  const emulatorBinary = getEmulatorBinaryPath(sdkPath);
  const platform = os.platform();
  const adbBinary = platform === 'win32' ? 'adb.exe' : 'adb';
  const adbPath = path.join(sdkPath, 'platform-tools', adbBinary);

  return {
    found: true,
    path: sdkPath,
    emulatorFound: fs.existsSync(emulatorBinary),
    adbFound: fs.existsSync(adbPath),
  };
}
