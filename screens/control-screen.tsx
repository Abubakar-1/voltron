import React, {useState, useEffect} from 'react';
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

// Define device states
type DeviceState = 'unknown' | 'on' | 'off';

const ControlScreen = () => {
  const {
    isConnected,
    connectionStatus,
    sendCommand,
    receivedData,
    lastUpdated,
    connectionError,
  } = useBluetooth();

  // Track device states
  const [powerState, setPowerState] = useState<DeviceState>('unknown');
  const [energyValue, setEnergyValue] = useState<number | null>(null);
  const [costValue, setCostValue] = useState<number | null>(null);
  const [initialStateFetched, setInitialStateFetched] = useState(false);
  const [isSendingCommand, setIsSendingCommand] = useState(false);

  // Parse received data to update states
  useEffect(() => {
    if (!receivedData) {
      return;
    }

    // Process data line by line
    const lines = receivedData.split('\n');
    let updatedPowerState = false;

    lines.forEach(line => {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('POWER:')) {
        const powerValue = parseFloat(trimmedLine.substring(6));
        setPowerState(powerValue > 0 ? 'on' : 'off');
        updatedPowerState = true;
      } else if (trimmedLine.startsWith('ENERGY:')) {
        const value = parseFloat(trimmedLine.substring(7));
        if (!isNaN(value)) {
          setEnergyValue(value);
        }
      } else if (trimmedLine.startsWith('COST:')) {
        const value = parseFloat(trimmedLine.substring(5));
        if (!isNaN(value)) {
          setCostValue(value);
        }
      }
    });

    // If we received any data and haven't fetched initial state yet
    if (lines.length > 0 && !initialStateFetched) {
      setInitialStateFetched(updatedPowerState); // Only mark as fetched if we got power state
    }
  }, [receivedData]);

  // Request initial state when connected
  useEffect(() => {
    if (isConnected && !initialStateFetched) {
      // Reset states when connecting
      setPowerState('unknown');
      setEnergyValue(null);
      setCostValue(null);

      // Request current status from device
      console.log('Requesting initial device state...');
      setIsSendingCommand(true);
      sendCommand('STATUS', 'high')
        .then(() => {
          console.log('Initial state request sent');
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
      setPowerState('unknown');
      setEnergyValue(null);
      setCostValue(null);
      setInitialStateFetched(false);
    }
  }, [isConnected, initialStateFetched]);

  // Toggle power state
  const togglePower = async () => {
    if (!isConnected || powerState === 'unknown' || isSendingCommand) {
      return;
    }

    const newState = powerState === 'on' ? 'off' : 'on';
    const command = `POWER:${newState === 'on' ? '1' : '0'}`;

    try {
      setIsSendingCommand(true);
      console.log(`Toggling power to ${newState}`);

      // Optimistically update UI
      setPowerState('unknown'); // Show loading state

      await sendCommand(command, 'high');
      console.log('Power toggle command sent');

      // Request status update to confirm change
      setTimeout(() => {
        sendCommand('STATUS', 'high').catch(error => {
          console.error('Failed to request status after toggle:', error);
        });
      }, 500);
    } catch (error) {
      console.error('Failed to toggle power:', error);
      Alert.alert('Error', 'Failed to toggle power');

      // Revert to previous state on error
      setPowerState(powerState);
    } finally {
      setIsSendingCommand(false);
    }
  };

  // Send test echo command
  const sendEchoTest = async () => {
    if (!isConnected || isSendingCommand) {
      return;
    }

    try {
      setIsSendingCommand(true);
      console.log('Sending echo test command');
      await sendCommand('ECHO:TEST', 'high');
      console.log('Echo test command sent');
    } catch (error) {
      console.error('Failed to send echo test:', error);
      Alert.alert('Error', 'Failed to send echo test');
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
    } catch (error) {
      console.error('Failed to request status:', error);
      Alert.alert('Error', 'Failed to request status');
    } finally {
      setIsSendingCommand(false);
    }
  };

  // Render power button with appropriate state
  const renderPowerButton = () => {
    // Determine button style based on state
    let buttonStyle = [styles.powerButton, styles.powerButtonUnknown];
    let textStyle = styles.powerButtonText;
    let buttonText = 'Unknown';
    let disabled = !isConnected || powerState === 'unknown' || isSendingCommand;

    if (powerState === 'on') {
      buttonStyle = [styles.powerButton, styles.powerButtonOn];
      buttonText = 'ON';
      disabled = !isConnected || isSendingCommand;
    } else if (powerState === 'off') {
      buttonStyle = [styles.powerButton, styles.powerButtonOff];
      buttonText = 'OFF';
      disabled = !isConnected || isSendingCommand;
    }

    return (
      <TouchableOpacity
        style={[...buttonStyle, disabled ? styles.buttonDisabled : null]}
        onPress={togglePower}
        disabled={disabled}>
        {powerState === 'unknown' && isConnected ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={textStyle}>{buttonText}</Text>
        )}
      </TouchableOpacity>
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
        <Text style={styles.sectionTitle}>Power Control</Text>
        {renderPowerButton()}

        <View style={styles.dataContainer}>
          <Text style={styles.dataLabel}>Energy:</Text>
          <Text style={styles.dataValue}>
            {energyValue !== null ? `${energyValue.toFixed(2)} kWh` : 'Unknown'}
          </Text>
        </View>

        <View style={styles.dataContainer}>
          <Text style={styles.dataLabel}>Cost:</Text>
          <Text style={styles.dataValue}>
            {costValue !== null ? `$${costValue.toFixed(2)}` : 'Unknown'}
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            !isConnected || isSendingCommand ? styles.buttonDisabled : null,
          ]}
          onPress={requestStatus}
          disabled={!isConnected || isSendingCommand}>
          <Text style={styles.buttonText}>Refresh Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            !isConnected || isSendingCommand ? styles.buttonDisabled : null,
          ]}
          onPress={sendEchoTest}
          disabled={!isConnected || isSendingCommand}>
          <Text style={styles.buttonText}>Test Echo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.debugContainer}>
        <Text style={styles.debugTitle}>Debug Information</Text>
        <Text style={styles.debugText}>
          Connected: {isConnected ? 'Yes' : 'No'}
          {'\n'}
          Initial State Fetched: {initialStateFetched ? 'Yes' : 'No'}
          {'\n'}
          Power State: {powerState}
          {'\n'}
          Sending Command: {isSendingCommand ? 'Yes' : 'No'}
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
  powerButton: {
    padding: 20,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: 100,
    height: 100,
    alignSelf: 'center',
  },
  powerButtonOn: {
    backgroundColor: '#4CAF50',
  },
  powerButtonOff: {
    backgroundColor: '#F44336',
  },
  powerButtonUnknown: {
    backgroundColor: '#9E9E9E',
  },
  powerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dataContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dataLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dataValue: {
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  debugContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginTop: 20,
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
