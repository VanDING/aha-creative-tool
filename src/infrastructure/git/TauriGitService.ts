/**
 * AHA Git Service — Tauri backend bridge
 *
 * Wraps git2-rs operations exposed via Tauri invoke commands.
 */

import { invoke } from '@tauri-apps/api/core';

export interface CommitLog {
  hash: string;
  message: string;
  author: string;
  timestamp: number;
}

export interface DiffResult {
  patch: string;
}

export interface FileStatus {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'other';
}

export interface GitStatus {
  branch: string;
  files: FileStatus[];
}

export interface GitService {
  init(projectPath: string): Promise<void>;
  add(filePath: string): Promise<void>;
  commit(message: string): Promise<string>;
  rm(filePath: string): Promise<void>;
  status(): Promise<GitStatus>;
  log(filePath?: string, limit?: number): Promise<CommitLog[]>;
  diff(commitA: string, commitB?: string): Promise<DiffResult>;
  createBranch(name: string): Promise<void>;
  switchBranch(name: string): Promise<void>;
  mergeBranch(name: string): Promise<void>;
  createTag(name: string, message: string): Promise<void>;
  listTags(): Promise<string[]>;
}

export class TauriGitService implements GitService {
  constructor(private repoPath: string) {}

  async init(projectPath: string): Promise<void> {
    await invoke('git_init', { path: projectPath });
  }

  async add(filePath: string): Promise<void> {
    await invoke('git_add', { repoPath: this.repoPath, filePath });
  }

  async commit(message: string): Promise<string> {
    return invoke<string>('git_commit', { repoPath: this.repoPath, message });
  }

  async rm(filePath: string): Promise<void> {
    await invoke('git_rm', { repoPath: this.repoPath, filePath });
  }

  async status(): Promise<GitStatus> {
    const result = await invoke<{
      branch: string;
      files: Array<{ path: string; status: string }>;
    }>('git_status', { repoPath: this.repoPath });

    return {
      branch: result.branch,
      files: result.files.map((f) => ({
        path: f.path,
        status: (f.status as FileStatus['status']) || 'other',
      })),
    };
  }

  async log(filePath?: string, limit = 50): Promise<CommitLog[]> {
    return invoke<CommitLog[]>('git_log', {
      repoPath: this.repoPath,
      filePath,
      limit,
    });
  }

  async diff(commitA: string, commitB?: string): Promise<DiffResult> {
    return invoke<DiffResult>('git_diff', {
      repoPath: this.repoPath,
      commitA,
      commitB,
    });
  }

  async createBranch(name: string): Promise<void> {
    await invoke('git_create_branch', { repoPath: this.repoPath, name });
  }

  async switchBranch(name: string): Promise<void> {
    await invoke('git_switch_branch', { repoPath: this.repoPath, name });
  }

  async mergeBranch(name: string): Promise<void> {
    await invoke('git_merge_branch', { repoPath: this.repoPath, name });
  }

  async createTag(name: string, message: string): Promise<void> {
    await invoke('git_create_tag', { repoPath: this.repoPath, name, message });
  }

  async listTags(): Promise<string[]> {
    return invoke<string[]>('git_list_tags', { repoPath: this.repoPath });
  }
}
