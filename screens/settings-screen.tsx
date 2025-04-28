'use client';

import {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import Slider from '@react-native-community/slider';
import {useBluetooth} from '../context/bluetooth-context';
import Icon from 'react-native-vector-icons/Feather';

export function SettingsScreen() {
  const {
    isConnected,
    isScanning,
    devices,
    unpairedDevices,
    connectedDevice,
    scan,
    scanForUnpaired,
    connect,
    disconnect,
    sendCommand,
    lastUpdated,
    reconnect,
    connectionError,
    pairDevice,
  } = useBluetooth();

  const [powerFactor, setPowerFactor] = useState(0.8);
  const [debounceTime, setDebounceTime] = useState(5000);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('Never');

  useEffect(() => {
    // Update the last update time when data is received
    if (lastUpdated) {
      const now = new Date();
      const diff = now.getTime() - lastUpdated.getTime();

      if (diff < 1000) {
        setLastUpdateTime('Just now');
      } else if (diff < 60000) {
        setLastUpdateTime(`${Math.floor(diff / 1000)} seconds ago`);
      } else if (diff < 3600000) {
        setLastUpdateTime(`${Math.floor(diff / 60000)} minutes ago`);
      } else {
        setLastUpdateTime(lastUpdated.toLocaleTimeString());
      }
    }

    // Update the time every second
    const interval = setInterval(() => {
      if (lastUpdated) {
        const now = new Date();
        const diff = now.getTime() - lastUpdated.getTime();

        if (diff < 1000) {
          setLastUpdateTime('Just now');
        } else if (diff < 60000) {
          setLastUpdateTime(`${Math.floor(diff / 1000)} seconds ago`);
        } else if (diff < 3600000) {
          setLastUpdateTime(`${Math.floor(diff / 60000)} minutes ago`);
        } else {
          setLastUpdateTime(lastUpdated.toLocaleTimeString());
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  const updatePowerFactor = (value: number) => {
    if (!isConnected) {
      console.log('Please connect to your device first');
      return;
    }

    const command = `PF ${value.toFixed(1)}`;
    sendCommand(command)
      .then(() => {
        setPowerFactor(value);
        console.log(`Power factor set to ${value.toFixed(1)}`);
      })
      .catch(() => {
        // Error is already handled in the context
      });
  };

  const updateDebounceTime = (value: number) => {
    if (!isConnected) {
      console.log('Please connect to your device first');
      return;
    }

    const command = `SET DEBOUNCE ${value}`;
    sendCommand(command)
      .then(() => {
        setDebounceTime(value);
        console.log(`Light debounce time set to ${value}ms`);
      })
      .catch(() => {
        // Error is already handled in the context
      });
  };

  const resetEnergy = () => {
    if (!isConnected) {
      console.log('Please connect to your device first');
      return;
    }

    sendCommand('ENERGY RESET')
      .then(() => {
        console.log('Energy counters have been reset');
      })
      .catch(() => {
        // Error is already handled in the context
      });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Icon name="bluetooth" size={16} color="#0070f3" />
            <Text style={styles.cardTitle}>Device Connection</Text>
          </View>
          {isConnected && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                Last update: {lastUpdateTime}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.cardContent}>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Bluetooth Status</Text>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusDot,
                  isConnected ? styles.connected : styles.disconnected,
                ]}
              />
              <Text style={styles.statusText}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>

          {connectionError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{connectionError}</Text>
            </View>
          )}

          {!isConnected ? (
            <FlatList
              data={[...devices, ...unpairedDevices]}
              keyExtractor={item => item.id}
              ListHeaderComponent={() => (
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={() => scan()}
                    disabled={isScanning}>
                    <Text style={styles.buttonText}>
                      {isScanning ? 'Scanning...' : 'Scan Paired'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={() => scanForUnpaired()}
                    disabled={isScanning}>
                    <Text style={styles.buttonText}>Discover New</Text>
                  </TouchableOpacity>
                  {devices.length > 0 && (
                    <View style={styles.deviceList}>
                      <Text style={styles.deviceListTitle}>Paired Devices</Text>
                    </View>
                  )}
                </View>
              )}
              renderItem={({item}) => {
                const isPaired = devices.some(device => device.id === item.id);
                return (
                  <View style={styles.deviceItem}>
                    <Text style={styles.deviceName}>
                      {item.name || item.address}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.button,
                        styles.smallButton,
                        styles.primaryButton,
                      ]}
                      onPress={() =>
                        isPaired ? connect(item.id) : pairDevice(item.id)
                      }>
                      <Text style={styles.buttonText}>
                        {isPaired ? 'Connect' : 'Pair'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
              ListFooterComponent={() =>
                unpairedDevices.length > 0 && (
                  <View style={styles.deviceList}>
                    <Text style={styles.deviceListTitle}>
                      Discovered Devices
                    </Text>
                  </View>
                )
              }
              ListEmptyComponent={() => (
                <Text style={{textAlign: 'center', marginTop: 20}}>
                  No devices found
                </Text>
              )}
              contentContainerStyle={{paddingBottom: 20}}
            />
          ) : (
            <>
              <Text style={styles.connectedDevice}>
                Connected to:{' '}
                {connectedDevice?.name || connectedDevice?.address}
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.dangerButton]}
                  onPress={disconnect}>
                  <Text style={styles.buttonText}>Disconnect</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={() => sendCommand('STATUS')}>
                  <View style={styles.buttonContent}>
                    <Icon
                      name="refresh-cw"
                      size={16}
                      color="white"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.buttonText}>Refresh</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Icon name="sliders" size={16} color="#0070f3" />
            <Text style={styles.cardTitle}>System Settings</Text>
          </View>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>
              Power Factor: {powerFactor.toFixed(1)}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0.1}
              maximumValue={1.0}
              step={0.1}
              value={powerFactor}
              onValueChange={setPowerFactor}
              onSlidingComplete={updatePowerFactor}
              disabled={!isConnected}
              minimumTrackTintColor="#0070f3"
              maximumTrackTintColor="#d1d5db"
              thumbTintColor="#0070f3"
            />
          </View>

          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>
              Light Debounce Time: {debounceTime}ms
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={1000}
              maximumValue={10000}
              step={500}
              value={debounceTime}
              onValueChange={setDebounceTime}
              onSlidingComplete={updateDebounceTime}
              disabled={!isConnected}
              minimumTrackTintColor="#0070f3"
              maximumTrackTintColor="#d1d5db"
              thumbTintColor="#0070f3"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton, styles.fullWidthButton]}
            onPress={resetEnergy}
            disabled={!isConnected}>
            <View style={styles.buttonContent}>
              <Icon
                name="rotate-ccw"
                size={16}
                color="white"
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Reset Energy Counters</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cardContent: {
    padding: 16,
  },
  badge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#666',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
  },
  statusContainer: {
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
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  smallButton: {
    flex: 0,
    paddingHorizontal: 12,
  },
  fullWidthButton: {
    marginHorizontal: 0,
  },
  primaryButton: {
    backgroundColor: '#0070f3',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  deviceList: {
    marginTop: 8,
    marginBottom: 16,
  },
  deviceListTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  deviceListContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    maxHeight: 160,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  deviceName: {
    fontSize: 14,
  },
  connectedDevice: {
    fontSize: 14,
    marginBottom: 16,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
