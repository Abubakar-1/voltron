'use client';

import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function ToastProvider({children}: {children: ReactNode}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [nextId, setNextId] = useState(0);

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = nextId;
    setNextId(id + 1);

    setToasts(current => [...current, {...toast, id}]);

    // Auto-remove toast after 3 seconds
    setTimeout(() => {
      setToasts(current => current.filter(t => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{showToast}}>
      {children}
      <View style={styles.toastContainer}>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastItem({toast}: {toast: Toast}) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2400),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim]);

  const getBgColor = () => {
    switch (toast.type) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      default:
        return '#3b82f6';
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {backgroundColor: getBgColor()},
        {opacity: fadeAnim},
      ]}>
      <Text style={styles.toastTitle}>{toast.title}</Text>
      <Text style={styles.toastMessage}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  toastTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  toastMessage: {
    color: 'white',
  },
});

export function useToast() {
  return useContext(ToastContext);
}
