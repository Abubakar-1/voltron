'use client';

import {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
    level: 0,
    threshold: 500,
    isOn: false,
    isAuto: true,
  });
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
      const lines = receivedData.split('\n');

      for (const line of lines) {
        // Parse socket data
        if (line.includes('Socket 1:')) {
          const isOn = line.includes('ON');
          const powerMatch = line.match(/(\d+\.\d+)W/);
          const energyMatch = line.match(/(\d+\.\d+) kWh/);
          const costMatch = line.match(/₦(\d+\.\d+)/);

          if (powerMatch || energyMatch || costMatch) {
            setSocket1Data(prev => ({
              ...prev,
              isOn,
              power: powerMatch ? Number.parseFloat(powerMatch[1]) : prev.power,
              energy: energyMatch
                ? Number.parseFloat(energyMatch[1])
                : prev.energy,
              cost: costMatch ? Number.parseFloat(costMatch[1]) : prev.cost,
            }));
          }
        }

        if (line.includes('Socket 2:')) {
          const isOn = line.includes('ON');
          const powerMatch = line.match(/(\d+\.\d+)W/);
          const energyMatch = line.match(/(\d+\.\d+) kWh/);
          const costMatch = line.match(/₦(\d+\.\d+)/);

          if (powerMatch || energyMatch || costMatch) {
            setSocket2Data(prev => ({
              ...prev,
              isOn,
              power: powerMatch ? Number.parseFloat(powerMatch[1]) : prev.power,
              energy: energyMatch
                ? Number.parseFloat(energyMatch[1])
                : prev.energy,
              cost: costMatch ? Number.parseFloat(costMatch[1]) : prev.cost,
            }));
          }
        }

        // Parse voltage and current data
        const voltageMatch1 = line.match(/Socket 1.*V:(\d+\.\d+)V/);
        if (voltageMatch1) {
          setSocket1Data(prev => ({
            ...prev,
            voltage: Number.parseFloat(voltageMatch1[1]),
          }));
        }

        const currentMatch1 = line.match(/Socket 1.*I:(\d+\.\d+)A/);
        if (currentMatch1) {
          setSocket1Data(prev => ({
            ...prev,
            current: Number.parseFloat(currentMatch1[1]),
          }));
        }

        const voltageMatch2 = line.match(/Socket 2.*V:(\d+\.\d+)V/);
        if (voltageMatch2) {
          setSocket2Data(prev => ({
            ...prev,
            voltage: Number.parseFloat(voltageMatch2[1]),
          }));
        }

        const currentMatch2 = line.match(/Socket 2.*I:(\d+\.\d+)A/);
        if (currentMatch2) {
          setSocket2Data(prev => ({
            ...prev,
            current: Number.parseFloat(currentMatch2[1]),
          }));
        }

        // Parse light data
        if (line.includes('Light level:')) {
          const levelMatch = line.match(/Light level: (\d+)/);
          if (levelMatch) {
            setLightData(prev => ({
              ...prev,
              level: Number.parseInt(levelMatch[1]),
            }));
          }
        }

        if (line.includes('Light threshold:')) {
          const thresholdMatch = line.match(/Light threshold: (\d+)/);
          if (thresholdMatch) {
            setLightData(prev => ({
              ...prev,
              threshold: Number.parseInt(thresholdMatch[1]),
            }));
          }
        }

        if (line.includes('Light relay:')) {
          const isOn = line.includes('ON');
          setLightData(prev => ({
            ...prev,
            isOn,
          }));
        }

        if (line.includes('Auto mode:')) {
          const isAuto = line.includes('ON');
          setLightData(prev => ({
            ...prev,
            isAuto,
          }));
        }
      }

      // Clear the refreshing state if it was set
      setIsRefreshing(false);
    }
  }, [isConnected, receivedData]);

  // Request status update every 3 seconds if connected
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        sendCommand('STATUS').catch(error => {
          console.error('Error sending periodic status command:', error);
        });
      }
    }, 3000);

    return () => clearInterval(interval);
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
              {/* {isRefreshing ? (
                <ActivityIndicator size="small" color="#0070f3" />
              ) : (
                <Icon name="refresh-cw" size={18} color="#0070f3" />
              )} */}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            {/* <Icon name="activity" size={16} color="#0070f3" /> */}
            <Text style={styles.cardTitle}>Total Power</Text>
          </View>
          <Text style={styles.cardValue}>
            {(socket1Data.power + socket2Data.power).toFixed(1)} W
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            {/* <Icon name="zap" size={16} color="#0070f3" /> */}
            <Text style={styles.cardTitle}>Total Energy</Text>
          </View>
          <Text style={styles.cardValue}>
            {(socket1Data.energy + socket2Data.energy).toFixed(2)} kWh
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {/* <Icon name="dollar-sign" size={16} color="#0070f3" /> */}
          <Text style={styles.cardTitle}>Total Cost</Text>
        </View>
        <Text style={styles.cardValue}>
          ₦{(socket1Data.cost + socket2Data.cost).toFixed(2)}
        </Text>
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
        {/* <PowerMeter value={socket1Data.power} max={2000} /> */}
        <View style={styles.socketDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Voltage:</Text>
            <Text style={styles.detailValue}>
              {socket1Data.voltage.toFixed(1)} V
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current:</Text>
            <Text style={styles.detailValue}>
              {socket1Data.current.toFixed(2)} A
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
        {/* <PowerMeter value={socket2Data.power} max={2000} /> */}
        <View style={styles.socketDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Voltage:</Text>
            <Text style={styles.detailValue}>
              {socket2Data.voltage.toFixed(1)} V
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current:</Text>
            <Text style={styles.detailValue}>
              {socket2Data.current.toFixed(2)} A
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
              Light Level: {lightData.level.toFixed(0)}
            </Text>
            <Text style={styles.lightInfoText}>
              Threshold: {lightData.threshold}
            </Text>
            <Text style={styles.lightInfoText}>
              Mode: {lightData.isAuto ? 'Automatic' : 'Manual'}
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
