'use client';

import {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useBluetooth} from '../context/bluetooth-context';
// import Icon from 'react-native-vector-icons/Feather';

export function DashboardScreen() {
  const {isConnected, sendCommand, receivedData, lastUpdated} = useBluetooth();
  const [socket1Data, setSocket1Data] = useState({
    voltage: 0,
    current: 0,
    power: 0,
    energy: 0,
    cost: 0,
    isOn: false,
  });
  const [socket2Data, setSocket2Data] = useState({
    voltage: 0,
    current: 0,
    power: 0,
    energy: 0,
    cost: 0,
    isOn: false,
  });
  const [lightData, setLightData] = useState({
    isOn: false,
  });
  const [powerFactor, setPowerFactor] = useState(0.8);
  const [totalPower, setTotalPower] = useState(0);
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('Never');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update the last update time
  useEffect(() => {
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

  // Parse received data from the ESP32
  useEffect(() => {
    if (isConnected && receivedData) {
      // Process the received data
      const lines = receivedData.split('\r');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          continue;
        }

        // Parse socket data
        if (trimmedLine.startsWith('Socket 1:')) {
          try {
            const parts = trimmedLine.split(',');
            const isOn = parts[0].includes('ON');
            const powerMatch = parts[1].trim().replace('W', '');
            const energyMatch = parts[2].trim().split(' ')[0];
            const costMatch = parts[3].trim().replace('₦', '');

            setSocket1Data(prev => ({
              ...prev,
              isOn,
              power: powerMatch ? Number.parseFloat(powerMatch) : prev.power,
              energy: energyMatch
                ? Number.parseFloat(energyMatch)
                : prev.energy,
              cost: costMatch ? Number.parseFloat(costMatch) : prev.cost,
            }));
          } catch (error) {
            console.error('Error parsing Socket 1 data:', error);
          }
        }

        if (trimmedLine.startsWith('Socket 2:')) {
          try {
            const parts = trimmedLine.split(',');
            const isOn = parts[0].includes('ON');
            const powerMatch = parts[1].trim().replace('W', '');
            const energyMatch = parts[2].trim().split(' ')[0];
            const costMatch = parts[3].trim().replace('₦', '');

            setSocket2Data(prev => ({
              ...prev,
              isOn,
              power: powerMatch ? Number.parseFloat(powerMatch) : prev.power,
              energy: energyMatch
                ? Number.parseFloat(energyMatch)
                : prev.energy,
              cost: costMatch ? Number.parseFloat(costMatch) : prev.cost,
            }));
          } catch (error) {
            console.error('Error parsing Socket 2 data:', error);
          }
        }

        // Parse light relay status
        if (trimmedLine.startsWith('Light relay:')) {
          const isOn = trimmedLine.includes('ON');
          setLightData(prev => ({
            ...prev,
            isOn,
          }));
        }

        // Parse power factor
        if (trimmedLine.startsWith('Power factor:')) {
          try {
            const pf = Number.parseFloat(trimmedLine.split(':')[1].trim());
            setPowerFactor(pf);
          } catch (error) {
            console.error('Error parsing power factor:', error);
          }
        }

        // Parse total energy
        if (trimmedLine.startsWith('Total energy:')) {
          try {
            const energy = Number.parseFloat(
              trimmedLine.split(':')[1].trim().split(' ')[0],
            );
            setTotalEnergy(energy);
          } catch (error) {
            console.error('Error parsing total energy:', error);
          }
        }

        // Parse total power
        if (trimmedLine.startsWith('Total power:')) {
          try {
            const power = Number.parseFloat(
              trimmedLine.split(':')[1].trim().split(' ')[0],
            );
            setTotalPower(power);
          } catch (error) {
            console.error('Error parsing total power:', error);
          }
        }

        // Parse total cost
        if (trimmedLine.startsWith('Total cost:')) {
          try {
            const cost = Number.parseFloat(
              trimmedLine.split(':')[1].trim().replace('₦', ''),
            );
            setTotalCost(cost);
          } catch (error) {
            console.error('Error parsing total cost:', error);
          }
        }
      }

      // Clear the refreshing state if it was set
      setIsRefreshing(false);
    }
  }, [isConnected, receivedData]);

  // Request status update when the component mounts
  useEffect(() => {
    if (isConnected) {
      sendCommand('STATUS').catch(error => {
        console.error('Error sending initial status command:', error);
      });
    }
  }, [isConnected, sendCommand]);

  const handleRefresh = () => {
    if (isConnected) {
      setIsRefreshing(true);
      sendCommand('STATUS').catch(error => {
        console.error('Error sending manual refresh command:', error);
        setIsRefreshing(false);
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        {isConnected && (
          <View style={styles.updateInfo}>
            <Text style={styles.updateText}>Updated: {lastUpdateTime}</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              disabled={!isConnected || isRefreshing}>
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#0070f3" />
              ) : (
                <Text style={{color: '#0070f3'}}>↻</Text> // Simple refresh icon
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Total Power</Text>
          </View>
          <Text style={styles.cardValue}>{totalPower.toFixed(1)} W</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Total Energy</Text>
          </View>
          <Text style={styles.cardValue}>{totalEnergy.toFixed(3)} kWh</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Total Cost</Text>
        </View>
        <Text style={styles.cardValue}>₦{totalCost.toFixed(2)}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Socket 1</Text>
          <View
            style={[
              styles.statusBadge,
              socket1Data.isOn ? styles.statusOn : styles.statusOff,
            ]}>
            <Text style={styles.statusText}>
              {socket1Data.isOn ? 'ON' : 'OFF'}
            </Text>
          </View>
        </View>
        <View style={styles.socketDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Power:</Text>
            <Text style={styles.detailValue}>
              {socket1Data.power.toFixed(1)} W
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Energy:</Text>
            <Text style={styles.detailValue}>
              {socket1Data.energy.toFixed(3)} kWh
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Cost:</Text>
            <Text style={styles.detailValue}>
              ₦{socket1Data.cost.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Socket 2</Text>
          <View
            style={[
              styles.statusBadge,
              socket2Data.isOn ? styles.statusOn : styles.statusOff,
            ]}>
            <Text style={styles.statusText}>
              {socket2Data.isOn ? 'ON' : 'OFF'}
            </Text>
          </View>
        </View>
        <View style={styles.socketDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Power:</Text>
            <Text style={styles.detailValue}>
              {socket2Data.power.toFixed(1)} W
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Energy:</Text>
            <Text style={styles.detailValue}>
              {socket2Data.energy.toFixed(3)} kWh
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Cost:</Text>
            <Text style={styles.detailValue}>
              ₦{socket2Data.cost.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Light Control</Text>
          <View
            style={[
              styles.statusBadge,
              lightData.isOn ? styles.statusOn : styles.statusOff,
            ]}>
            <Text style={styles.statusText}>
              {lightData.isOn ? 'ON' : 'OFF'}
            </Text>
          </View>
        </View>
        <View style={styles.lightInfo}>
          <View>
            <Text style={styles.lightInfoText}>
              Power Factor: {powerFactor.toFixed(2)}
            </Text>
          </View>
          <View
            style={[
              styles.lightIndicator,
              lightData.isOn ? styles.lightOn : styles.lightOff,
            ]}
          />
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
  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  updateText: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginRight: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
  socketDetails: {
    marginTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    color: '#666',
  },
  detailValue: {
    fontWeight: '500',
  },
  lightInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lightInfoText: {
    marginBottom: 4,
  },
  lightIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  lightOn: {
    backgroundColor: '#fbbf24',
  },
  lightOff: {
    backgroundColor: '#d1d5db',
  },
});
