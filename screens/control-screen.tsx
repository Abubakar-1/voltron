'use client';

import {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import {useBluetooth} from '../context/bluetooth-context';
import Slider from '@react-native-community/slider';

// Define device states
type DeviceState = 'unknown' | 'on' | 'off';

// Define socket data structure
interface SocketData {
  state: DeviceState;
  power: number | null;
  energy: number | null;
  cost: number | null;
  hasOverload: boolean;
}

// Define system data structure
interface SystemData {
  lightRelay: DeviceState;
  socket1: SocketData;
  socket2: SocketData;
  powerFactor: number | null;
  totalEnergy: number | null;
  totalPower: number | null;
  totalCost: number | null;
}

const ControlScreen = () => {
  const {
    isConnected,
    connectionStatus,
    sendCommand,
    receivedData,
    lastUpdated,
    connectionError,
  } = useBluetooth();

  // Initialize system data
  const [systemData, setSystemData] = useState<SystemData>({
    lightRelay: 'unknown',
    socket1: {
      state: 'unknown',
      power: null,
      energy: null,
      cost: null,
      hasOverload: false,
    },
    socket2: {
      state: 'unknown',
      power: null,
      energy: null,
      cost: null,
      hasOverload: false,
    },
    powerFactor: null,
    totalEnergy: null,
    totalPower: null,
    totalCost: null,
  });

  const [initialStateFetched, setInitialStateFetched] = useState(false);
  const [isSendingCommand, setIsSendingCommand] = useState(false);
  const [powerFactorValue, setPowerFactorValue] = useState(0.8);
  const [commandHistory, setCommandHistory] = useState<
    Array<{command: string; timestamp: Date}>
  >([]);

  // Parse received data to update states
  useEffect(() => {
    if (!receivedData) {
      return;
    }

    // Process data line by line (device uses \r as line endings)
    const lines = receivedData.split('\r');
    const updatedSystemData = {...systemData};
    let stateUpdated = false;

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        return;
      }

      // Light relay status
      if (trimmedLine.startsWith('Light relay:')) {
        updatedSystemData.lightRelay = trimmedLine.includes('ON')
          ? 'on'
          : 'off';
        stateUpdated = true;
      }
      // Socket 1 status
      else if (trimmedLine.startsWith('Socket 1:')) {
        try {
          const parts = trimmedLine.split(',');
          updatedSystemData.socket1.state = parts[0].includes('ON')
            ? 'on'
            : 'off';
          updatedSystemData.socket1.power = Number.parseFloat(
            parts[1].trim().replace('W', ''),
          );
          updatedSystemData.socket1.energy = Number.parseFloat(
            parts[2].trim().split(' ')[0],
          );
          updatedSystemData.socket1.cost = Number.parseFloat(
            parts[3].trim().replace('₦', ''),
          );
          stateUpdated = true;
        } catch (error) {
          console.error('Error parsing Socket 1 data:', error);
        }
      }
      // Socket 2 status
      else if (trimmedLine.startsWith('Socket 2:')) {
        try {
          const parts = trimmedLine.split(',');
          updatedSystemData.socket2.state = parts[0].includes('ON')
            ? 'on'
            : 'off';
          updatedSystemData.socket2.power = Number.parseFloat(
            parts[1].trim().replace('W', ''),
          );
          updatedSystemData.socket2.energy = Number.parseFloat(
            parts[2].trim().split(' ')[0],
          );
          updatedSystemData.socket2.cost = Number.parseFloat(
            parts[3].trim().replace('₦', ''),
          );
          stateUpdated = true;
        } catch (error) {
          console.error('Error parsing Socket 2 data:', error);
        }
      }
      // Power factor
      else if (trimmedLine.startsWith('Power factor:')) {
        try {
          const pf = Number.parseFloat(trimmedLine.split(':')[1].trim());
          updatedSystemData.powerFactor = pf;
          setPowerFactorValue(pf); // Update slider value
          stateUpdated = true;
        } catch (error) {
          console.error('Error parsing power factor:', error);
        }
      }
      // Total energy
      else if (trimmedLine.startsWith('Total energy:')) {
        try {
          updatedSystemData.totalEnergy = Number.parseFloat(
            trimmedLine.split(':')[1].trim().split(' ')[0],
          );
          stateUpdated = true;
        } catch (error) {
          console.error('Error parsing total energy:', error);
        }
      }
      // Total power
      else if (trimmedLine.startsWith('Total power:')) {
        try {
          updatedSystemData.totalPower = Number.parseFloat(
            trimmedLine.split(':')[1].trim().split(' ')[0],
          );
          stateUpdated = true;
        } catch (error) {
          console.error('Error parsing total power:', error);
        }
      }
      // Total cost
      else if (trimmedLine.startsWith('Total cost:')) {
        try {
          updatedSystemData.totalCost = Number.parseFloat(
            trimmedLine.split(':')[1].trim().replace('₦', ''),
          );
          stateUpdated = true;
        } catch (error) {
          console.error('Error parsing total cost:', error);
        }
      }
      // Warning messages
      else if (
        trimmedLine.startsWith('WARNING: Overload detected on Socket 1')
      ) {
        updatedSystemData.socket1.hasOverload = true;
        stateUpdated = true;
      } else if (
        trimmedLine.startsWith('WARNING: Overload detected on Socket 2')
      ) {
        updatedSystemData.socket2.hasOverload = true;
        stateUpdated = true;
      }
      // Invalid command response
      else if (trimmedLine.startsWith('Invalid command')) {
        console.warn('Invalid command received:', trimmedLine);
        // Alert.alert(
        //   'Command Error',
        //   'The device did not recognize the command',
        // );
      }
    });

    if (stateUpdated) {
      setSystemData(updatedSystemData);

      // If we received meaningful data and haven't fetched initial state yet
      if (!initialStateFetched) {
        setInitialStateFetched(true);
      }
    }
  }, [receivedData]);

  // Request initial state when connected
  useEffect(() => {
    if (isConnected && !initialStateFetched) {
      // Reset states when connecting
      setSystemData({
        lightRelay: 'unknown',
        socket1: {
          state: 'unknown',
          power: null,
          energy: null,
          cost: null,
          hasOverload: false,
        },
        socket2: {
          state: 'unknown',
          power: null,
          energy: null,
          cost: null,
          hasOverload: false,
        },
        powerFactor: null,
        totalEnergy: null,
        totalPower: null,
        totalCost: null,
      });

      // Request current status from device
      console.log('Requesting initial device state...');
      setIsSendingCommand(true);
      sendCommand('STATUS', 'high')
        .then(() => {
          console.log('Initial state request sent');
          addToCommandHistory('STATUS');
        })
        .catch(error => {
          console.error('Failed to request initial state:', error);
          Alert.alert('Error', 'Failed to request device state');
        })
        .finally(() => {
          setIsSendingCommand(false);
        });
    }

    // Reset states when disconnected
    if (!isConnected) {
      setSystemData({
        lightRelay: 'unknown',
        socket1: {
          state: 'unknown',
          power: null,
          energy: null,
          cost: null,
          hasOverload: false,
        },
        socket2: {
          state: 'unknown',
          power: null,
          energy: null,
          cost: null,
          hasOverload: false,
        },
        powerFactor: null,
        totalEnergy: null,
        totalPower: null,
        totalCost: null,
      });
      setInitialStateFetched(false);
    }
  }, [isConnected, initialStateFetched]);

  // Add command to history
  const addToCommandHistory = (command: string) => {
    setCommandHistory(prev => {
      const newHistory = [...prev, {command, timestamp: new Date()}];
      // Keep only the last 10 commands
      if (newHistory.length > 10) {
        return newHistory.slice(newHistory.length - 10);
      }
      return newHistory;
    });
  };

  // Toggle light relay - CORRECT COMMAND: L ON / L OFF
  const toggleLightRelay = async () => {
    if (
      !isConnected ||
      systemData.lightRelay === 'unknown' ||
      isSendingCommand
    ) {
      return;
    }

    const newState = systemData.lightRelay === 'on' ? 'OFF' : 'ON';
    const command = `L ${newState}`;

    try {
      setIsSendingCommand(true);
      console.log(`Toggling light relay to ${newState}`);
      console.log('Exact command being sent:', JSON.stringify(command));

      // Optimistically update UI immediately
      setSystemData(prev => ({
        ...prev,
        lightRelay: newState.toLowerCase() === 'on' ? 'on' : 'off',
      }));

      // Send the command with high priority
      await sendCommand(command, 'high');
      console.log('Light relay toggle command sent');
      addToCommandHistory(command);

      // Send the command again after a short delay to ensure it is received
      setTimeout(() => {
        console.log('Sending light relay command again to ensure reception');
        sendCommand(command, 'high').catch(error => {
          console.error('Failed to send follow-up light command:', error);
        });
      }, 200);

      // Request status update to confirm change, but don't wait for it to update UI
      setTimeout(() => {
        sendCommand('STATUS', 'high')
          .then(() => addToCommandHistory('STATUS'))
          .catch(error => {
            console.error('Failed to request status after toggle:', error);
          });
      }, 1000); // Increased from 300ms to 1000ms to give more time for light command to take effect
    } catch (error) {
      console.error('Failed to toggle light relay:', error);
      Alert.alert('Error', 'Failed to toggle light relay');

      // Revert to previous state on error
      setSystemData(prev => ({
        ...prev,
        lightRelay: systemData.lightRelay,
      }));
    } finally {
      setIsSendingCommand(false);
    }
  };

  // Toggle socket 1 - CORRECT COMMAND: R1 ON / R1 OFF
  const toggleSocket1 = async () => {
    if (
      !isConnected ||
      systemData.socket1.state === 'unknown' ||
      isSendingCommand
    ) {
      return;
    }

    // Don't allow turning on if there's an overload
    if (systemData.socket1.hasOverload && systemData.socket1.state === 'off') {
      Alert.alert(
        'Overload Warning',
        'Socket 1 has an overload condition. Resolve the overload before turning it on.',
        [{text: 'OK'}],
      );
      return;
    }

    const newState = systemData.socket1.state === 'on' ? 'OFF' : 'ON';
    const command = `R1 ${newState}`;

    try {
      setIsSendingCommand(true);
      console.log(`Toggling Socket 1 to ${newState}`);
      console.log('Exact command being sent:', JSON.stringify(command));

      // Optimistically update UI immediately
      setSystemData(prev => ({
        ...prev,
        socket1: {
          ...prev.socket1,
          state: newState.toLowerCase() === 'on' ? 'on' : 'off',
        },
      }));

      await sendCommand(command, 'high');
      console.log('Socket 1 toggle command sent');
      addToCommandHistory(command);

      // Request status update to confirm change, but don't wait for it to update UI
      setTimeout(() => {
        sendCommand('STATUS', 'high')
          .then(() => addToCommandHistory('STATUS'))
          .catch(error => {
            console.error('Failed to request status after toggle:', error);
          });
      }, 300); // Reduced from 500ms to 300ms
    } catch (error) {
      console.error('Failed to toggle Socket 1:', error);
      Alert.alert('Error', 'Failed to toggle Socket 1');

      // Revert to previous state on error
      setSystemData(prev => ({
        ...prev,
        socket1: {
          ...prev.socket1,
          state: systemData.socket1.state,
        },
      }));
    } finally {
      setIsSendingCommand(false);
    }
  };

  // Toggle socket 2 - CORRECT COMMAND: R2 ON / R2 OFF
  const toggleSocket2 = async () => {
    if (
      !isConnected ||
      systemData.socket2.state === 'unknown' ||
      isSendingCommand
    ) {
      return;
    }

    // Don't allow turning on if there's an overload
    if (systemData.socket2.hasOverload && systemData.socket2.state === 'off') {
      Alert.alert(
        'Overload Warning',
        'Socket 2 has an overload condition. Resolve the overload before turning it on.',
        [{text: 'OK'}],
      );
      return;
    }

    const newState = systemData.socket2.state === 'on' ? 'OFF' : 'ON';
    const command = `R2 ${newState}`;

    try {
      setIsSendingCommand(true);
      console.log(`Toggling Socket 2 to ${newState}`);
      console.log('Exact command being sent:', JSON.stringify(command));

      // Optimistically update UI immediately
      setSystemData(prev => ({
        ...prev,
        socket2: {
          ...prev.socket2,
          state: newState.toLowerCase() === 'on' ? 'on' : 'off',
        },
      }));

      await sendCommand(command, 'high');
      console.log('Socket 2 toggle command sent');
      addToCommandHistory(command);

      // Request status update to confirm change, but don't wait for it to update UI
      setTimeout(() => {
        sendCommand('STATUS', 'high')
          .then(() => addToCommandHistory('STATUS'))
          .catch(error => {
            console.error('Failed to request status after toggle:', error);
          });
      }, 300); // Reduced from 500ms to 300ms
    } catch (error) {
      console.error('Failed to toggle Socket 2:', error);
      Alert.alert('Error', 'Failed to toggle Socket 2');

      // Revert to previous state on error
      setSystemData(prev => ({
        ...prev,
        socket2: {
          ...prev.socket2,
          state: systemData.socket2.state,
        },
      }));
    } finally {
      setIsSendingCommand(false);
    }
  };

  // Request status update
  const requestStatus = async () => {
    if (!isConnected || isSendingCommand) {
      return;
    }

    try {
      setIsSendingCommand(true);
      console.log('Requesting status update');
      await sendCommand('STATUS', 'high');
      console.log('Status request sent');
      addToCommandHistory('STATUS');
    } catch (error) {
      console.error('Failed to request status:', error);
      Alert.alert('Error', 'Failed to request status');
    } finally {
      setIsSendingCommand(false);
    }
  };

  // Send DISPLAY command
  const sendDisplayCommand = async () => {
    if (!isConnected || isSendingCommand) {
      return;
    }

    try {
      setIsSendingCommand(true);
      console.log('Sending DISPLAY command');
      await sendCommand('DISPLAY', 'high');
      console.log('DISPLAY command sent');
      addToCommandHistory('DISPLAY');
    } catch (error) {
      console.error('Failed to send DISPLAY command:', error);
      Alert.alert('Error', 'Failed to send DISPLAY command');
    } finally {
      setIsSendingCommand(false);
    }
  };

  // Set power factor
  const setPowerFactor = async (value: number) => {
    if (!isConnected || isSendingCommand) {
      return;
    }

    // Round to 1 decimal place
    const pfValue = Math.round(value * 10) / 10;
    const command = `PF ${pfValue.toFixed(1)}`;

    try {
      setIsSendingCommand(true);
      console.log(`Setting power factor to ${pfValue}`);
      await sendCommand(command, 'high');
      console.log('Power factor command sent');
      addToCommandHistory(command);

      // Request status update to confirm change
      setTimeout(() => {
        sendCommand('STATUS', 'high')
          .then(() => addToCommandHistory('STATUS'))
          .catch(error => {
            console.error('Failed to request status after setting PF:', error);
          });
      }, 500);
    } catch (error) {
      console.error('Failed to set power factor:', error);
      Alert.alert('Error', 'Failed to set power factor');
    } finally {
      setIsSendingCommand(false);
    }
  };

  // Render control button with appropriate state
  const renderControlButton = (
    state: DeviceState,
    onPress: () => void,
    label: string,
    hasWarning = false,
  ) => {
    // Determine button style based on state
    let buttonStyle = [styles.controlButton, styles.buttonUnknown];
    const textStyle = styles.buttonText;
    let buttonText = 'Unknown';
    let disabled = !isConnected || state === 'unknown' || isSendingCommand;

    if (state === 'on') {
      buttonStyle = [styles.controlButton, styles.buttonOn];
      buttonText = 'ON';
      disabled = !isConnected || isSendingCommand;
    } else if (state === 'off') {
      buttonStyle = [styles.controlButton, styles.buttonOff];
      buttonText = 'OFF';
      disabled = !isConnected || isSendingCommand;
    }

    // Add warning style if needed
    if (hasWarning) {
      buttonStyle.push(styles.buttonWarning);
    }

    return (
      <View style={styles.controlItem}>
        <Text style={styles.controlLabel}>{label}</Text>
        <TouchableOpacity
          style={[...buttonStyle, disabled ? styles.buttonDisabled : null]}
          onPress={onPress}
          disabled={disabled}>
          {state === 'unknown' && isConnected ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={textStyle}>{buttonText}</Text>
          )}
        </TouchableOpacity>
        {hasWarning && <Text style={styles.warningText}>⚠️ Overload</Text>}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status:{' '}
          {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
        </Text>
        {connectionError && (
          <Text style={styles.errorText}>{connectionError}</Text>
        )}
        {lastUpdated && (
          <Text style={styles.lastUpdatedText}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Text>
        )}
      </View>

      <View style={styles.controlsContainer}>
        <Text style={styles.sectionTitle}>Device Controls</Text>

        <View style={styles.controlsGrid}>
          {renderControlButton(
            systemData.lightRelay,
            toggleLightRelay,
            'Light Relay',
          )}

          {renderControlButton(
            systemData.socket1.state,
            toggleSocket1,
            'Socket 1',
            systemData.socket1.hasOverload,
          )}

          {renderControlButton(
            systemData.socket2.state,
            toggleSocket2,
            'Socket 2',
            systemData.socket2.hasOverload,
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.refreshButton,
            !isConnected || isSendingCommand ? styles.buttonDisabled : null,
          ]}
          onPress={requestStatus}
          disabled={!isConnected || isSendingCommand}>
          <Text style={styles.refreshButtonText}>
            {isSendingCommand ? 'Refreshing...' : 'Refresh Status'}
          </Text>
        </TouchableOpacity>

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              !isConnected || isSendingCommand ? styles.buttonDisabled : null,
            ]}
            onPress={sendDisplayCommand}
            disabled={!isConnected || isSendingCommand}>
            <Text style={styles.actionButtonText}>DISPLAY</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.powerFactorContainer}>
        <Text style={styles.sectionTitle}>Power Factor Control</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>
            Power Factor: {powerFactorValue.toFixed(1)}
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={1.0}
            step={0.1}
            value={powerFactorValue}
            onValueChange={setPowerFactorValue}
            onSlidingComplete={() => setPowerFactor(powerFactorValue)}
            disabled={!isConnected || isSendingCommand}
            minimumTrackTintColor="#2196F3"
            maximumTrackTintColor="#000000"
            thumbTintColor={
              !isConnected || isSendingCommand ? '#cccccc' : '#2196F3'
            }
          />
          <View style={styles.sliderLabelsContainer}>
            <Text style={styles.sliderMinMaxLabel}>0.5</Text>
            <Text style={styles.sliderMinMaxLabel}>1.0</Text>
          </View>
        </View>
      </View>

      <View style={styles.dataContainer}>
        <Text style={styles.sectionTitle}>Power Metrics</Text>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Power Factor:</Text>
          <Text style={styles.dataValue}>
            {systemData.powerFactor !== null
              ? systemData.powerFactor.toFixed(2)
              : 'Unknown'}
          </Text>
        </View>

        <Text style={styles.subSectionTitle}>Socket 1</Text>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Power:</Text>
          <Text style={styles.dataValue}>
            {systemData.socket1.power !== null
              ? `${systemData.socket1.power.toFixed(1)} W`
              : 'Unknown'}
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Energy:</Text>
          <Text style={styles.dataValue}>
            {systemData.socket1.energy !== null
              ? `${systemData.socket1.energy.toFixed(3)} kWh`
              : 'Unknown'}
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Cost:</Text>
          <Text style={styles.dataValue}>
            {systemData.socket1.cost !== null
              ? `₦${systemData.socket1.cost.toFixed(2)}`
              : 'Unknown'}
          </Text>
        </View>

        <Text style={styles.subSectionTitle}>Socket 2</Text>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Power:</Text>
          <Text style={styles.dataValue}>
            {systemData.socket2.power !== null
              ? `${systemData.socket2.power.toFixed(1)} W`
              : 'Unknown'}
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Energy:</Text>
          <Text style={styles.dataValue}>
            {systemData.socket2.energy !== null
              ? `${systemData.socket2.energy.toFixed(3)} kWh`
              : 'Unknown'}
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Cost:</Text>
          <Text style={styles.dataValue}>
            {systemData.socket2.cost !== null
              ? `₦${systemData.socket2.cost.toFixed(2)}`
              : 'Unknown'}
          </Text>
        </View>

        <Text style={styles.subSectionTitle}>Total</Text>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Total Power:</Text>
          <Text style={styles.dataValue}>
            {systemData.totalPower !== null
              ? `${systemData.totalPower.toFixed(1)} W`
              : 'Unknown'}
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Total Energy:</Text>
          <Text style={styles.dataValue}>
            {systemData.totalEnergy !== null
              ? `${systemData.totalEnergy.toFixed(3)} kWh`
              : 'Unknown'}
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Total Cost:</Text>
          <Text style={styles.dataValue}>
            {systemData.totalCost !== null
              ? `₦${systemData.totalCost.toFixed(2)}`
              : 'Unknown'}
          </Text>
        </View>
      </View>

      <View style={styles.commandHistoryContainer}>
        <Text style={styles.sectionTitle}>Command History</Text>
        {commandHistory.length === 0 ? (
          <Text style={styles.noCommandsText}>No commands sent yet</Text>
        ) : (
          commandHistory.map((item, index) => (
            <View key={index} style={styles.commandItem}>
              <Text style={styles.commandText}>{item.command}</Text>
              <Text style={styles.commandTime}>
                {item.timestamp.toLocaleTimeString()}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.debugContainer}>
        <Text style={styles.debugTitle}>Debug Information</Text>
        <Text style={styles.debugText}>
          Connected: {isConnected ? 'Yes' : 'No'}
          {'\n'}
          Initial State Fetched: {initialStateFetched ? 'Yes' : 'No'}
          {'\n'}
          Sending Command: {isSendingCommand ? 'Yes' : 'No'}
          {'\n'}
          Light Relay: {systemData.lightRelay}
          {'\n'}
          Socket 1: {systemData.socket1.state}{' '}
          {systemData.socket1.hasOverload ? '(Overload)' : ''}
          {'\n'}
          Socket 2: {systemData.socket2.state}{' '}
          {systemData.socket2.hasOverload ? '(Overload)' : ''}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  statusContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginTop: 5,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  controlsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 4,
  },
  controlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  controlItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlLabel: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOn: {
    backgroundColor: '#4CAF50',
  },
  buttonOff: {
    backgroundColor: '#F44336',
  },
  buttonUnknown: {
    backgroundColor: '#9E9E9E',
  },
  buttonWarning: {
    borderWidth: 3,
    borderColor: '#FFC107',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  warningText: {
    color: '#FFC107',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: '#673AB7',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  powerFactorContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sliderContainer: {
    marginVertical: 10,
  },
  sliderLabel: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  sliderMinMaxLabel: {
    fontSize: 12,
    color: '#666',
  },
  dataContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  dataValue: {
    fontSize: 14,
  },
  commandHistoryContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  noCommandsText: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    paddingVertical: 10,
  },
  commandItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  commandText: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
  commandTime: {
    fontSize: 12,
    color: '#666',
  },
  debugContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  debugTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
});

export default ControlScreen;
