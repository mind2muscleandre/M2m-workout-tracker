// ============================================
// Offline Sync Logic
// AsyncStorage <-> Supabase sync with last-write-wins
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Keys for AsyncStorage
const SYNC_QUEUE_KEY = '@sync_queue';
const LAST_SYNC_KEY = '@last_sync';
const CACHE_PREFIX = '@cache_';

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error';

interface SyncQueueItem {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

// ============================================
// Cache Management
// ============================================

/**
 * Save data to local cache
 */
export async function cacheData(key: string, data: unknown): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.error('Error caching data:', error);
  }
}

/**
 * Get data from local cache
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed.data as T;
  } catch (error) {
    console.error('Error reading cached data:', error);
    return null;
  }
}

/**
 * Clear specific cache
 */
export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error('Error clearing all cache:', error);
  }
}

// ============================================
// Sync Queue Management
// ============================================

/**
 * Get all pending sync operations
 */
async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const queue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
}

/**
 * Save sync queue
 */
async function saveSyncQueue(queue: SyncQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Add operation to sync queue (when offline)
 */
export async function addToSyncQueue(
  table: string,
  operation: 'insert' | 'update' | 'delete',
  data: Record<string, unknown>
): Promise<void> {
  const queue = await getSyncQueue();
  const item: SyncQueueItem = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    table,
    operation,
    data,
    timestamp: Date.now(),
    retryCount: 0,
  };
  queue.push(item);
  await saveSyncQueue(queue);
}

/**
 * Process sync queue - attempt to sync all pending operations
 * Uses last-write-wins strategy for conflicts
 */
export async function processSyncQueue(): Promise<{
  synced: number;
  failed: number;
  remaining: number;
}> {
  const queue = await getSyncQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, remaining: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: SyncQueueItem[] = [];

  for (const item of queue) {
    try {
      let result;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const table = supabase.from(item.table as any) as any;

      switch (item.operation) {
        case 'insert':
          result = await table.insert(item.data);
          break;
        case 'update': {
          const { id, ...updateData } = item.data;
          result = await table.update(updateData).eq('id', id);
          break;
        }
        case 'delete':
          result = await table.delete().eq('id', item.data.id);
          break;
      }

      if (result?.error) {
        throw result.error;
      }

      synced++;
    } catch (error) {
      console.error(`Sync failed for ${item.table}:${item.operation}`, error);
      item.retryCount++;

      // Keep in queue if under max retries
      if (item.retryCount < 5) {
        remaining.push(item);
      } else {
        failed++;
        console.error(`Permanently failed sync item after 5 retries:`, item);
      }
    }
  }

  await saveSyncQueue(remaining);
  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

  return { synced, failed, remaining: remaining.length };
}

/**
 * Get current sync status
 */
export async function getSyncStatus(): Promise<{
  status: SyncStatus;
  pendingCount: number;
  lastSync: string | null;
}> {
  const queue = await getSyncQueue();
  const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);

  if (queue.length === 0) {
    return { status: 'synced', pendingCount: 0, lastSync };
  }

  return { status: 'pending', pendingCount: queue.length, lastSync };
}

/**
 * Wrapper for Supabase operations with offline fallback
 * Attempts online operation first, falls back to queue if offline
 */
export async function syncableOperation(
  table: string,
  operation: 'insert' | 'update' | 'delete',
  data: Record<string, unknown>,
  onlineOperation: () => Promise<{ error: unknown }>
): Promise<{ success: boolean; offline: boolean }> {
  try {
    const result = await onlineOperation();
    if (result.error) {
      throw result.error;
    }
    return { success: true, offline: false };
  } catch (error) {
    // Check if it's a network error
    const isNetworkError =
      error instanceof TypeError &&
      (error.message.includes('Network') || error.message.includes('fetch'));

    if (isNetworkError) {
      await addToSyncQueue(table, operation, data);
      return { success: true, offline: true };
    }

    // Re-throw non-network errors
    throw error;
  }
}

// ============================================
// Sync Store (Zustand-compatible)
// ============================================

import { create } from 'zustand';

interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSync: string | null;
  isSyncing: boolean;
  checkStatus: () => Promise<void>;
  syncNow: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'synced',
  pendingCount: 0,
  lastSync: null,
  isSyncing: false,

  checkStatus: async () => {
    const result = await getSyncStatus();
    set({
      status: result.status,
      pendingCount: result.pendingCount,
      lastSync: result.lastSync,
    });
  },

  syncNow: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });

    try {
      const result = await processSyncQueue();
      const status = await getSyncStatus();
      set({
        status: status.status,
        pendingCount: status.pendingCount,
        lastSync: status.lastSync,
        isSyncing: false,
      });

      if (result.failed > 0) {
        console.warn(`${result.failed} sync operations permanently failed`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      set({ status: 'error', isSyncing: false });
    }
  },
}));
