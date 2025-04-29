'use client';

import {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import {useBluetooth} from '../context/bluetooth-context';
import Icon from 'react-native-vector-icons/Feather';

export function ControlScreen() {
  const {isConnected, sendCommand, receivedData, connectionError} =
    useBluetooth();

  const [socket1On, setSocket1On] = useState(false);
  const [socket2On, setSocket2On] = useState(false);
  const [lightOn, setLightOn] = useState(false);
  const [autoLightMode, setAutoLightMode] = useState(true);
  const [lightThreshold, setLightThreshold] = useState(500);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Add additional state for energy monitoring
  const [socket1Power, setSocket1Power] = useState(0);
  const [socket2Power, setSocket2Power] = useState(0);
  const [socket1Energy, setSocket1Energy] = useState(0);
  const [socket2Energy, setSocket2Energy] = useState(0);
  const [socket1Cost, setSocket1Cost] = useState(0);
  const [socket2Cost, setSocket2Cost] = useState(0);
  const [lightLevel, setLightLevel] = useState(0);

  // Parse received data to update control states
  useEffect(() => {
    if (isConnected && receivedData) {
      const lines = receivedData.split('\n');

      for (const line of lines) {
        // Parse socket states with power, energy and cost
        if (line.includes('Socket 1:')) {
          const isOn = line.includes('ON');
          setSocket1On(isOn);

          // Parse power
          const powerMatch = line.match(/(\d+\.\d+)W/);
          if (powerMatch) {
            setSocket1Power(Number.parseFloat(powerMatch[1]));
          }

          // Parse energy
          const energyMatch = line.match(/(\d+\.\d+) kWh/);
          if (energyMatch) {
            setSocket1Energy(Number.parseFloat(energyMatch[1]));
          }

          // Parse cost
          const costMatch = line.match(/₦(\d+\.\d+)/);
          if (costMatch) {
            setSocket1Cost(Number.parseFloat(costMatch[1]));
          }
        }

        if (line.includes('Socket 2:')) {
          const isOn = line.includes('ON');
          setSocket2On(isOn);

          // Parse power
          const powerMatch = line.match(/(\d+\.\d+)W/);
          if (powerMatch) {
            setSocket2Power(Number.parseFloat(powerMatch[1]));
          }

          // Parse energy
          const energyMatch = line.match(/(\d+\.\d+) kWh/);
          if (energyMatch) {
            setSocket2Energy(Number.parseFloat(energyMatch[1]));
          }

          // Parse cost
          const costMatch = line.match(/₦(\d+\.\d+)/);
          if (costMatch) {
            setSocket2Cost(Number.parseFloat(costMatch[1]));
          }
        }

        // Parse light states
        if (line.includes('Light relay:')) {
          const isOn = line.includes('ON');
          setLightOn(isOn);
        }

        if (line.includes('Light threshold:')) {
          const thresholdMatch = line.match(/Light threshold: (\d+)/);
          if (thresholdMatch) {
            setLightThreshold(Number.parseInt(thresholdMatch[1]));
          }
        }

        // Parse light level
        if (line.includes('Light level:')) {
          const levelMatch = line.match(/Light level: (\d+)/);
          if (levelMatch) {
            setLightLevel(Number.parseInt(levelMatch[1]));
          }
        }

        // Parse auto mode
        if (line.includes('Auto mode:')) {
          const isAuto = line.includes('ON');
          setAutoLightMode(isAuto);
        }
      }

      // Clear refreshing state
      setIsRefreshing(false);
    }
  }, [isConnected, receivedData]);

  // Show connection error alerts
  useEffect(() => {
    if (connectionError) {
      Alert.alert('Connection Error', connectionError);
    }
  }, [connectionError]);

  // Request initial status when connected
  useEffect(() => {
    if (isConnected) {
      handleRefresh();
    }
  }, [isConnected]);

  const handleRefresh = () => {
    if (isConnected) {
      setIsRefreshing(true);
      sendCommand('STATUS').catch(error => {
        console.error('Error sending refresh command:', error);
        setIsRefreshing(false);
      });
    }
  };

  const toggleSocket = (socket: number, state: boolean) => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to your device first');
      return;
    }

    const command = `R${socket} ${state ? 'ON' : 'OFF'}`;
    sendCommand(command)
      .then(() => {
        if (socket === 1) {
          setSocket1On(state);
        } else {
          setSocket2On(state);
        }

        console.log(`Socket ${socket} has been turned ${state ? 'on' : 'off'}`);

        // Request status update to confirm changes
        setTimeout(() => {
          sendCommand('STATUS').catch(error => {
            console.error('Error sending status command after toggle:', error);
          });
        }, 500);
      })
      .catch(error => {
        Alert.alert(
          'Command Failed',
          `Failed to turn socket ${socket} ${state ? 'on' : 'off'}`,
        );
      });
  };

  const toggleLight = (state: boolean) => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to your device first');
      return;
    }

    const command = `L ${state ? 'ON' : 'OFF'}`;
    sendCommand(command)
      .then(() => {
        setLightOn(state);
        console.log(`Light has been turned ${state ? 'on' : 'off'}`);

        // Request status update to confirm changes
        setTimeout(() => {
          sendCommand('STATUS').catch(error => {
            console.error('Error sending status command after toggle:', error);
          });
        }, 500);
      })
      .catch(error => {
        Alert.alert(
          'Command Failed',
          `Failed to turn light ${state ? 'on' : 'off'}`,
        );
      });
  };

  const toggleAutoLight = (state: boolean) => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to your device first');
      return;
    }

    const command = `AUTO ${state ? 'ON' : 'OFF'}`;
    sendCommand(command)
      .then(() => {
        setAutoLightMode(state);
        console.log(`Auto light mode has been turned ${state ? 'on' : 'off'}`);

        // Request status update to confirm changes
        setTimeout(() => {
          sendCommand('STATUS').catch(error => {
            console.error('Error sending status command after toggle:', error);
          });
        }, 500);
      })
      .catch(error => {
        Alert.alert(
          'Command Failed',
          `Failed to set auto light mode to ${state ? 'on' : 'off'}`,
        );
      });
  };

  const updateLightThreshold = (value: number) => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to your device first');
      return;
    }

    const command = `SET THRESHOLD ${value}`;
    sendCommand(command)
      .then(() => {
        setLightThreshold(value);
        console.log(`Light threshold set to ${value}`);

        // Request status update to confirm changes
        setTimeout(() => {
          sendCommand('STATUS').catch(error => {
            console.error('Error sending status command after update:', error);
          });
        }, 500);
      })
      .catch(error => {
        Alert.alert('Command Failed', 'Failed to update light threshold');
      });
  };

  const resetEnergy = () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to your device first');
      return;
    }

    Alert.alert(
      'Reset Energy Counters',
      'Are you sure you want to reset all energy counters?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            sendCommand('ENERGY RESET')
              .then(() => {
                console.log('Energy counters reset');
                // Request status update to confirm changes
                setTimeout(() => {
                  sendCommand('STATUS').catch(error => {
                    console.error(
                      'Error sending status command after reset:',
                      error,
                    );
                  });
                }, 500);
              })
              .catch(error => {
                Alert.alert(
                  'Command Failed',
                  'Failed to reset energy counters',
                );
              });
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Control Panel</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={!isConnected || isRefreshing}>
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#0070f3" />
          ) : (
            <Icon name="refresh-cw" size={18} color="#0070f3" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.connectionStatus}>
        <Text
          style={[
            styles.statusText,
            isConnected ? styles.connected : styles.disconnected,
          ]}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Icon name="power" size={16} color="#0070f3" />
            <Text style={styles.cardTitle}>Socket Control</Text>
          </View>
        </View>

        <View style={styles.controlRow}>
          <View style={styles.controlLabel}>
            <Icon name="zap" size={16} color="#666" />
            <Text style={styles.controlText}>Socket 1</Text>
          </View>
          <View style={styles.controlActions}>
            <View
              style={[
                styles.statusBadge,
                socket1On ? styles.statusOn : styles.statusOff,
              ]}>
              <Text style={styles.statusText}>{socket1On ? 'ON' : 'OFF'}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.button,
                socket1On ? styles.activeButton : styles.inactiveButton,
              ]}
              onPress={() => toggleSocket(1, true)}
              disabled={socket1On || !isConnected}>
              <Text style={styles.buttonText}>On</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                !socket1On ? styles.activeButton : styles.inactiveButton,
              ]}
              onPress={() => toggleSocket(1, false)}
              disabled={!socket1On || !isConnected}>
              <Text style={styles.buttonText}>Off</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add power and energy info for Socket 1 */}
        <View style={styles.energyInfo}>
          <Text style={styles.energyText}>
            Power: {socket1Power.toFixed(1)}W
          </Text>
          <Text style={styles.energyText}>
            Energy: {socket1Energy.toFixed(3)} kWh
          </Text>
          <Text style={styles.energyText}>Cost: ₦{socket1Cost.toFixed(2)}</Text>
        </View>

        <View style={styles.controlRow}>
          <View style={styles.controlLabel}>
            <Icon name="zap" size={16} color="#666" />
            <Text style={styles.controlText}>Socket 2</Text>
          </View>
          <View style={styles.controlActions}>
            <View
              style={[
                styles.statusBadge,
                socket2On ? styles.statusOn : styles.statusOff,
              ]}>
              <Text style={styles.statusText}>{socket2On ? 'ON' : 'OFF'}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.button,
                socket2On ? styles.activeButton : styles.inactiveButton,
              ]}
              onPress={() => toggleSocket(2, true)}
              disabled={socket2On || !isConnected}>
              <Text style={styles.buttonText}>On</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                !socket2On ? styles.activeButton : styles.inactiveButton,
              ]}
              onPress={() => toggleSocket(2, false)}
              disabled={!socket2On || !isConnected}>
              <Text style={styles.buttonText}>Off</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add power and energy info for Socket 2 */}
        <View style={styles.energyInfo}>
          <Text style={styles.energyText}>
            Power: {socket2Power.toFixed(1)}W
          </Text>
          <Text style={styles.energyText}>
            Energy: {socket2Energy.toFixed(3)} kWh
          </Text>
          <Text style={styles.energyText}>Cost: ₦{socket2Cost.toFixed(2)}</Text>
        </View>

        {/* Add reset energy button */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetEnergy}
          disabled={!isConnected}>
          <Text style={styles.resetButtonText}>Reset Energy Counters</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Icon name="sun" size={16} color="#0070f3" />
            <Text style={styles.cardTitle}>Light Control</Text>
          </View>
        </View>

        <View style={styles.controlRow}>
          <View style={styles.controlLabel}>
            <Icon name="sun" size={16} color="#666" />
            <Text style={styles.controlText}>Light</Text>
          </View>
          <View style={styles.controlActions}>
            <View
              style={[
                styles.statusBadge,
                lightOn ? styles.statusOn : styles.statusOff,
              ]}>
              <Text style={styles.statusText}>{lightOn ? 'ON' : 'OFF'}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.button,
                lightOn ? styles.activeButton : styles.inactiveButton,
              ]}
              onPress={() => toggleLight(true)}
              disabled={lightOn || autoLightMode || !isConnected}>
              <Text style={styles.buttonText}>On</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                !lightOn ? styles.activeButton : styles.inactiveButton,
              ]}
              onPress={() => toggleLight(false)}
              disabled={!lightOn || autoLightMode || !isConnected}>
              <Text style={styles.buttonText}>Off</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.controlRow}>
          <View style={styles.controlLabel}>
            <Text style={styles.controlText}>Auto Light Mode</Text>
          </View>
          <View style={styles.controlActions}>
            <View
              style={[
                styles.statusBadge,
                autoLightMode ? styles.statusOn : styles.statusOff,
              ]}>
              <Text style={styles.statusText}>
                {autoLightMode ? 'ON' : 'OFF'}
              </Text>
            </View>
            <Switch
              value={autoLightMode}
              onValueChange={toggleAutoLight}
              disabled={!isConnected}
              trackColor={{false: '#d1d5db', true: '#bfdbfe'}}
              thumbColor={autoLightMode ? '#0070f3' : '#9ca3af'}
            />
          </View>
        </View>

        {/* Add current light level indicator */}
        <View style={styles.lightLevelContainer}>
          <Text style={styles.lightLevelText}>
            Current Light Level: {lightLevel}
          </Text>
          <View style={styles.lightLevelBar}>
            <View
              style={[
                styles.lightLevelFill,
                {width: `${Math.min(100, (lightLevel / 4000) * 100)}%`},
              ]}
            />
          </View>
        </View>

        <View style={styles.sliderContainer}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>
              Light Threshold: {lightThreshold}
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={4000}
            step={50}
            value={lightThreshold}
            onValueChange={setLightThreshold}
            onSlidingComplete={updateLightThreshold}
            disabled={!autoLightMode || !isConnected}
            minimumTrackTintColor="#0070f3"
            maximumTrackTintColor="#d1d5db"
            thumbTintColor="#0070f3"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderMinMax}>Dark</Text>
            <Text style={styles.sliderMinMax}>Light</Text>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  connectionStatus: {
    marginBottom: 16,
    alignItems: 'center',
  },
  statusText: {
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connected: {
    backgroundColor: '#10b981',
    color: 'white',
  },
  disconnected: {
    backgroundColor: '#ef4444',
    color: 'white',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
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
    marginBottom: 16,
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
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlText: {
    marginLeft: 8,
  },
  controlActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusOn: {
    backgroundColor: '#10b981',
  },
  statusOff: {
    backgroundColor: '#9ca3af',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeButton: {
    backgroundColor: '#0070f3',
  },
  inactiveButton: {
    backgroundColor: '#f0f0f0',
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
  sliderContainer: {
    marginTop: 8,
  },
  sliderHeader: {
    marginBottom: 8,
  },
  sliderLabel: {
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderMinMax: {
    fontSize: 12,
    color: '#666',
  },
  energyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  energyText: {
    fontSize: 12,
    color: '#4b5563',
  },
  resetButton: {
    backgroundColor: '#ef4444',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  lightLevelContainer: {
    marginBottom: 16,
  },
  lightLevelText: {
    marginBottom: 4,
  },
  lightLevelBar: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 5,
    overflow: 'hidden',
  },
  lightLevelFill: {
    height: '100%',
    backgroundColor: '#0070f3',
  },
});
