import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface OfflineContextType {
  isConnected: boolean;
  isOnline: boolean;
  connectionType: string | null;
  queuedActions: QueuedAction[];
  addToQueue: (action: QueuedAction) => Promise<void>;
  executeQueuedActions: () => Promise<void>;
  clearQueue: () => Promise<void>;
  getCachedData: (key: string) => Promise<any>;
  setCachedData: (key: string, data: any) => Promise<void>;
  removeCachedData: (key: string) => Promise<void>;
}

interface QueuedAction {
  id: string;
  type: 'API_CALL' | 'UPLOAD' | 'SYNC';
  endpoint: string;
  method: string;
  data?: any;
  timestamp: number;
  retryCount?: number;
}

interface OfflineProviderProps {
  children: ReactNode;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

const CACHE_PREFIX = 'offline_cache_';
const QUEUE_KEY = 'offline_queue';
const MAX_RETRY_COUNT = 3;

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState<string | null>('wifi');
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? false);
      setConnectionType(state.type);

      // Show connection status changes
      if (state.isConnected === false) {
        Alert.alert(
          '오프라인 모드',
          '인터넷 연결이 끊어졌습니다. 일부 기능이 제한될 수 있습니다.',
          [{ text: '확인' }]
        );
      } else if (state.isConnected === true && !isConnected) {
        Alert.alert('온라인 복구', '인터넷 연결이 복구되었습니다. 저장된 작업을 동기화합니다.', [
          { text: '확인' },
        ]);
        executeQueuedActions();
      }
    });

    // Load queued actions from storage
    loadQueuedActions();

    return () => unsubscribe();
  }, []);

  const loadQueuedActions = async () => {
    try {
      const queueData = await AsyncStorage.getItem(QUEUE_KEY);
      if (queueData) {
        setQueuedActions(JSON.parse(queueData));
      }
    } catch (error) {
      console.error('Error loading queued actions:', error);
    }
  };

  const saveQueuedActions = async (actions: QueuedAction[]) => {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(actions));
    } catch (error) {
      console.error('Error saving queued actions:', error);
    }
  };

  const addToQueue = async (action: QueuedAction) => {
    const newActions = [...queuedActions, { ...action, timestamp: Date.now() }];
    setQueuedActions(newActions);
    await saveQueuedActions(newActions);
  };

  const executeQueuedActions = async () => {
    if (!isConnected || queuedActions.length === 0) return;

    const actionsToExecute = [...queuedActions];
    const failedActions: QueuedAction[] = [];

    for (const action of actionsToExecute) {
      try {
        // Execute the action
        const response = await fetch(action.endpoint, {
          method: action.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: action.data ? JSON.stringify(action.data) : undefined,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log(`Offline action executed: ${action.type} - ${action.endpoint}`);
      } catch (error) {
        console.error(`Failed to execute offline action:`, error);

        // Add to failed actions with retry count
        const retryCount = (action.retryCount || 0) + 1;
        if (retryCount <= MAX_RETRY_COUNT) {
          failedActions.push({ ...action, retryCount });
        }
      }
    }

    // Update queue with only failed actions
    setQueuedActions(failedActions);
    await saveQueuedActions(failedActions);

    if (failedActions.length < actionsToExecute.length) {
      Alert.alert(
        '동기화 완료',
        `${actionsToExecute.length - failedActions.length}개의 작업이 성공적으로 동기화되었습니다.`,
        [{ text: '확인' }]
      );
    }
  };

  const clearQueue = async () => {
    setQueuedActions([]);
    await AsyncStorage.removeItem(QUEUE_KEY);
  };

  const getCachedData = async (key: string): Promise<any> => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_PREFIX + key);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  };

  const setCachedData = async (key: string, data: any): Promise<void> => {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };
      await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('Error setting cached data:', error);
    }
  };

  const removeCachedData = async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
    } catch (error) {
      console.error('Error removing cached data:', error);
    }
  };

  const value: OfflineContextType = {
    isConnected,
    isOnline: isConnected,
    connectionType,
    queuedActions,
    addToQueue,
    executeQueuedActions,
    clearQueue,
    getCachedData,
    setCachedData,
    removeCachedData,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};

export const useOffline = (): OfflineContextType => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

// Utility hook for offline-aware API calls
export const useOfflineAwareAPI = () => {
  const { isConnected, addToQueue, getCachedData, setCachedData } = useOffline();

  const makeRequest = async (
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string,
    useCache = true
  ) => {
    // If offline, try to get cached data
    if (!isConnected && cacheKey && useCache) {
      const cachedData = await getCachedData(cacheKey);
      if (cachedData && cachedData.expiresAt > Date.now()) {
        return {
          ok: true,
          json: () => Promise.resolve(cachedData.data),
          fromCache: true,
        };
      }
      throw new Error('No internet connection and no cached data available');
    }

    // If offline and no cache, queue the action
    if (!isConnected) {
      await addToQueue({
        id: Date.now().toString(),
        type: 'API_CALL',
        endpoint,
        method: options.method || 'GET',
        data: options.body ? JSON.parse(options.body as string) : undefined,
        timestamp: Date.now(),
      });
      throw new Error('Request queued for when connection is restored');
    }

    // Make the actual request
    try {
      const response = await fetch(endpoint, options);

      // Cache successful GET requests
      if (response.ok && (options.method || 'GET') === 'GET' && cacheKey) {
        const data = await response.clone().json();
        await setCachedData(cacheKey, data);
      }

      return response;
    } catch (error) {
      // If request fails and we have cached data, use it
      if (cacheKey && useCache) {
        const cachedData = await getCachedData(cacheKey);
        if (cachedData) {
          return {
            ok: true,
            json: () => Promise.resolve(cachedData.data),
            fromCache: true,
          };
        }
      }
      throw error;
    }
  };

  return { makeRequest, isConnected };
};

export default OfflineContext;
