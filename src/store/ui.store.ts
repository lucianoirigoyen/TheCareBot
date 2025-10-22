import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { LoadingState, Notification } from '@/types/medical';

interface UiState {
  // Theme and layout
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  
  // Notifications system
  notifications: Notification[];
  
  // Loading states for different sections
  loadingStates: Record<string, LoadingState<unknown>>;
  
  // Fallback configuration (cached/offline only - NO demo mode)
  fallbackMode: 'none' | 'cached' | 'offline';
  isOffline: boolean;
  
  // Medical session UI state
  sessionWarningVisible: boolean;
  sessionTimeoutDialogOpen: boolean;
  
  // File upload state
  uploadProgress: Record<string, number>; // fileId -> progress percentage
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  setLoadingState: (key: string, state: LoadingState<unknown>) => void;
  clearLoadingState: (key: string) => void;
  setFallbackMode: (mode: 'none' | 'cached' | 'offline') => void;
  setOfflineStatus: (isOffline: boolean) => void;
  setSessionWarningVisible: (visible: boolean) => void;
  setSessionTimeoutDialogOpen: (open: boolean) => void;
  setUploadProgress: (fileId: string, progress: number) => void;
  clearUploadProgress: (fileId: string) => void;
}

export const useUiStore = create<UiState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        theme: 'system',
        sidebarCollapsed: false,
        notifications: [],
        loadingStates: {},
        fallbackMode: 'none',
        isOffline: false,
        sessionWarningVisible: false,
        sessionTimeoutDialogOpen: false,
        uploadProgress: {},
        
        // Theme actions
        setTheme: (theme) => set({ theme }, false, 'setTheme'),
        
        // Sidebar actions
        toggleSidebar: () => set(
          (state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
          false,
          'toggleSidebar'
        ),
        
        // Notification actions
        addNotification: (notification) => set(
          (state) => ({
            notifications: [
              ...state.notifications,
              {
                ...notification,
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
              },
            ],
          }),
          false,
          'addNotification'
        ),
        
        removeNotification: (id) => set(
          (state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          }),
          false,
          'removeNotification'
        ),
        
        clearAllNotifications: () => set(
          { notifications: [] },
          false,
          'clearAllNotifications'
        ),
        
        // Loading state actions
        setLoadingState: (key, loadingState) => set(
          (state) => ({
            loadingStates: {
              ...state.loadingStates,
              [key]: loadingState,
            },
          }),
          false,
          'setLoadingState'
        ),
        
        clearLoadingState: (key) => set(
          (state) => {
            const { [key]: _, ...rest } = state.loadingStates;
            return { loadingStates: rest };
          },
          false,
          'clearLoadingState'
        ),
        
        // Fallback mode actions (cached/offline only - NO demo)
        setFallbackMode: (mode) => {
          set({ fallbackMode: mode }, false, 'setFallbackMode');

          // Log fallback mode changes for monitoring
          if (mode !== 'none') {
            console.warn(`[TheCareBot] Fallback mode activated: ${mode}`);
          }
        },

        setOfflineStatus: (isOffline) => {
          set({ isOffline }, false, 'setOfflineStatus');

          // Automatically set fallback mode when offline
          if (isOffline) {
            get().setFallbackMode('offline');
          } else if (get().fallbackMode === 'offline') {
            get().setFallbackMode('none');
          }
        },
        
        // Session actions
        setSessionWarningVisible: (visible) => set(
          { sessionWarningVisible: visible },
          false,
          'setSessionWarningVisible'
        ),
        
        setSessionTimeoutDialogOpen: (open) => set(
          { sessionTimeoutDialogOpen: open },
          false,
          'setSessionTimeoutDialogOpen'
        ),
        
        // Upload progress actions
        setUploadProgress: (fileId, progress) => set(
          (state) => ({
            uploadProgress: {
              ...state.uploadProgress,
              [fileId]: progress,
            },
          }),
          false,
          'setUploadProgress'
        ),
        
        clearUploadProgress: (fileId) => set(
          (state) => {
            const { [fileId]: _, ...rest } = state.uploadProgress;
            return { uploadProgress: rest };
          },
          false,
          'clearUploadProgress'
        ),
      }),
      {
        name: 'thecarebot-ui',
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          fallbackMode: state.fallbackMode,
        }),
        version: 1,
      }
    ),
    {
      name: 'UiStore',
    }
  )
);

// Selector hooks for better performance
export const useTheme = () => useUiStore((state) => state.theme);
export const useSidebarCollapsed = () => useUiStore((state) => state.sidebarCollapsed);
export const useNotifications = () => useUiStore((state) => state.notifications);
export const useIsOffline = () => useUiStore((state) => state.isOffline);
export const useFallbackMode = () => useUiStore((state) => state.fallbackMode);
export const useSessionWarning = () => useUiStore((state) => ({
  visible: state.sessionWarningVisible,
  dialogOpen: state.sessionTimeoutDialogOpen,
}));