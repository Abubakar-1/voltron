'use client';

import {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  PermissionsAndroid,
} from 'react-native';

export function BluetoothPermissions() {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [showPermissionUI, setShowPermissionUI] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Check if permissions are already granted
  useEffect(() => {
    // On platforms other than Android, assume permissions are granted
    if (Platform.OS !== 'android') {
      setPermissionsGranted(true);
      return;
    }

    // On Android, check permissions after a delay
    const timer = setTimeout(() => {
      checkPermissions();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const checkPermissions = async () => {
    if (Platform.OS !== 'android') {
      setPermissionsGranted(true);
      return;
    }

    try {
      // For Android 12+ (API level 31+)
      if (Platform.Version >= 31) {
        const hasBluetoothScan = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        );
        const hasBluetoothConnect = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        );
        const hasFineLocation = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );

        if (hasBluetoothScan && hasBluetoothConnect && hasFineLocation) {
          setPermissionsGranted(true);
        } else {
          setShowPermissionUI(true);
        }
      } else {
        // For Android < 12
        const hasFineLocation = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );

        if (hasFineLocation) {
          setPermissionsGranted(true);
        } else {
          setShowPermissionUI(true);
        }
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissionError('Failed to check permissions');
      setShowPermissionUI(true);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'android') {
      setPermissionsGranted(true);
      return;
    }

    try {
      setPermissionError(null);

      // For Android 12+ (API level 31+)
      if (Platform.Version >= 31) {
        const results = await Promise.all([
          PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            {
              title: 'Bluetooth Scan Permission',
              message:
                'This app needs permission to scan for Bluetooth devices',
              buttonPositive: 'OK',
            },
          ),
          PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            {
              title: 'Bluetooth Connect Permission',
              message:
                'This app needs permission to connect to Bluetooth devices',
              buttonPositive: 'OK',
            },
          ),
          PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message:
                'This app needs access to your location for Bluetooth scanning',
              buttonPositive: 'OK',
            },
          ),
        ]);

        const [bluetoothScan, bluetoothConnect, fineLocation] = results;

        if (
          bluetoothScan === PermissionsAndroid.RESULTS.GRANTED &&
          bluetoothConnect === PermissionsAndroid.RESULTS.GRANTED &&
          fineLocation === PermissionsAndroid.RESULTS.GRANTED
        ) {
          setPermissionsGranted(true);
          console.log('All permissions granted');
        } else {
          setPermissionError(
            'Some permissions were denied. The app may not work properly.',
          );
          console.log('Some permissions were denied');
        }
      } else {
        // For Android < 12
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'This app needs access to your location for Bluetooth scanning',
            buttonPositive: 'OK',
          },
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setPermissionsGranted(true);
          console.log('Location permission granted');
        } else {
          setPermissionError(
            'Location permission denied. The app may not work properly.',
          );
          console.log('Location permission denied');
        }
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setPermissionError(
        'Failed to request permissions: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  };

  // If permissions are granted or we're not on Android, don't show anything
  if (permissionsGranted || Platform.OS !== 'android') {
    return null;
  }

  // Only show the permission UI when ready
  if (!showPermissionUI) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Initializing...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bluetooth Permissions Required</Text>
      <Text style={styles.message}>
        This app needs Bluetooth and location permissions to connect to your
        energy monitor.
      </Text>

      {permissionError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{permissionError}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={requestPermissions}>
        <Text style={styles.buttonText}>Grant Permissions</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0070f3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
