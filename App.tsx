'use client';

import {SafeAreaView, StatusBar, StyleSheet, View, Text} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {BluetoothProvider} from './context/bluetooth-context';
import {BluetoothPermissions} from './components/bluetooth-permissions';
import {DashboardScreen} from './screens/dashboard-screen';
import {ControlScreen} from './screens/control-screen';
import {SettingsScreen} from './screens/settings-screen';
import {HistoryScreen} from './screens/history-screen';
import {useState, useEffect} from 'react';
import {CustomNavBar} from './components/custom-nav-bar';

function ConnectionStatus() {
  const {isConnected, connectedDevice, connectionError} = useBluetooth();

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Energy Monitor</Text>
      <View style={styles.connectionStatus}>
        <View
          style={[
            styles.statusDot,
            isConnected ? styles.connected : styles.disconnected,
          ]}
        />
        <Text style={styles.statusText}>
          {isConnected
            ? `Connected to ${
                connectedDevice?.name || connectedDevice?.address || 'device'
              }`
            : connectionError
            ? 'Connection Error'
            : 'Disconnected'}
        </Text>
      </View>
    </View>
  );
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState('Dashboard');
  const [appReady, setAppReady] = useState(false);

  // Wait for the app to be fully mounted before showing content
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppReady(true);
      console.log('App fully mounted, ready for permission requests');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Render the active screen based on the selected tab
  const renderScreen = () => {
    switch (activeScreen) {
      case 'Dashboard':
        return <DashboardScreen />;
      case 'Control':
        return <ControlScreen />;
      case 'Settings':
        return <SettingsScreen />;
      case 'History':
        return <HistoryScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  if (!appReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading Energy Monitor...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <BluetoothProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
          <BluetoothPermissions />
          <ConnectionStatus />

          <View style={styles.screenContainer}>{renderScreen()}</View>

          <CustomNavBar
            activeScreen={activeScreen}
            onScreenChange={setActiveScreen}
          />
        </SafeAreaView>
      </BluetoothProvider>
    </GestureHandlerRootView>
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
    backgroundColor: '#f5f5f5',
  },
  screenContainer: {
    flex: 1,
    marginBottom: 60, // Space for the navbar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connected: {
    backgroundColor: '#10b981',
  },
  disconnected: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 14,
  },
});

import {useBluetooth} from './context/bluetooth-context';
