/**
 * AHA Credential Store — Tauri keyring bridge
 *
 * API keys are stored in the OS-native keychain, never in plaintext files.
 */

import { invoke } from '@tauri-apps/api/core';

export interface CredentialStore {
  storeKey(providerId: string, key: string): Promise<void>;
  getKey(providerId: string): Promise<string | null>;
  deleteKey(providerId: string): Promise<void>;
}

const SERVICE_NAME = 'aha-ai-provider';

export class TauriCredentialStore implements CredentialStore {
  async storeKey(providerId: string, key: string): Promise<void> {
    await invoke('plugin:keyring|set_password', {
      service: SERVICE_NAME,
      account: providerId,
      password: key,
    });
  }

  async getKey(providerId: string): Promise<string | null> {
    try {
      return await invoke<string>('plugin:keyring|get_password', {
        service: SERVICE_NAME,
        account: providerId,
      });
    } catch {
      return null;
    }
  }

  async deleteKey(providerId: string): Promise<void> {
    await invoke('plugin:keyring|delete_password', {
      service: SERVICE_NAME,
      account: providerId,
    });
  }
}

export const credentialStore = new TauriCredentialStore();
