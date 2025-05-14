'use client';

import {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useBluetooth} from '../context/bluetooth-context';

// Define the data structure for energy history
interface EnergyRecord {
  timestamp: Date;
  socket1Power: number;
  socket2Power: number;
  socket1Energy: number;
  socket2Energy: number;
  socket1Cost: number;
  socket2Cost: number;
}

export function HistoryScreen() {
  const {isConnected, receivedData, lastUpdated} = useBluetooth();
  const [timeRange, setTimeRange] = useState('day');
  const [chartType, setChartType] = useState('energy');
  const [energyHistory, setEnergyHistory] = useState<EnergyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [summaryData, setSummaryData] = useState({
    totalEnergy: 0,
    totalCost: 0,
    averageDailyUsage: 0,
    peakPower: 0,
    socket1Usage: 0,
    socket2Usage: 0,
    socket1Percentage: 0,
    socket2Percentage: 0,
  });

  // Process received data to update energy history
  useEffect(() => {
    if (isConnected && receivedData) {
      const lines = receivedData.split('\r');
      let socket1Power = 0;
      let socket2Power = 0;
      let socket1Energy = 0;
      let socket2Energy = 0;
      let socket1Cost = 0;
      let socket2Cost = 0;
      let dataUpdated = false;

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          continue;
        }

        // Parse socket data
        if (trimmedLine.startsWith('Socket 1:')) {
          try {
            const parts = trimmedLine.split(',');
            const powerMatch = parts[1].trim().replace('W', '');
            const energyMatch = parts[2].trim().split(' ')[0];
            const costMatch = parts[3].trim().replace('₦', '');

            socket1Power = powerMatch ? Number.parseFloat(powerMatch) : 0;
            socket1Energy = energyMatch ? Number.parseFloat(energyMatch) : 0;
            socket1Cost = costMatch ? Number.parseFloat(costMatch) : 0;
            dataUpdated = true;
          } catch (error) {
            console.error('Error parsing Socket 1 data:', error);
          }
        }

        if (trimmedLine.startsWith('Socket 2:')) {
          try {
            const parts = trimmedLine.split(',');
            const powerMatch = parts[1].trim().replace('W', '');
            const energyMatch = parts[2].trim().split(' ')[0];
            const costMatch = parts[3].trim().replace('₦', '');

            socket2Power = powerMatch ? Number.parseFloat(powerMatch) : 0;
            socket2Energy = energyMatch ? Number.parseFloat(energyMatch) : 0;
            socket2Cost = costMatch ? Number.parseFloat(costMatch) : 0;
            dataUpdated = true;
          } catch (error) {
            console.error('Error parsing Socket 2 data:', error);
          }
        }
      }

      // If we have new data, add it to the history
      if (dataUpdated && lastUpdated) {
        // Only add a new record every 5 minutes to avoid too many data points
        const shouldAddRecord =
          energyHistory.length === 0 ||
          Date.now() -
            energyHistory[energyHistory.length - 1].timestamp.getTime() >
            5 * 60 * 1000;

        if (shouldAddRecord) {
          const newRecord: EnergyRecord = {
            timestamp: new Date(),
            socket1Power,
            socket2Power,
            socket1Energy,
            socket2Energy,
            socket1Cost,
            socket2Cost,
          };

          setEnergyHistory(prev => {
            // Keep only the last 24 hours of data (288 points at 5-minute intervals)
            const newHistory = [...prev, newRecord];
            if (newHistory.length > 288) {
              return newHistory.slice(newHistory.length - 288);
            }
            return newHistory;
          });
        }

        // Update summary data
        updateSummaryData(
          socket1Energy,
          socket2Energy,
          socket1Cost,
          socket2Cost,
          socket1Power,
          socket2Power,
        );
      }
    }
  }, [isConnected, receivedData, lastUpdated]);

  // Update summary data
  const updateSummaryData = (
    socket1Energy: number,
    socket2Energy: number,
    socket1Cost: number,
    socket2Cost: number,
    socket1Power: number,
    socket2Power: number,
  ) => {
    const totalEnergy = socket1Energy + socket2Energy;
    const totalCost = socket1Cost + socket2Cost;
    const socket1Percentage =
      totalEnergy > 0 ? (socket1Energy / totalEnergy) * 100 : 0;
    const socket2Percentage =
      totalEnergy > 0 ? (socket2Energy / totalEnergy) * 100 : 0;

    // Calculate peak power from history
    const peakPower = Math.max(
      ...energyHistory.map(record =>
        Math.max(record.socket1Power, record.socket2Power),
      ),
      socket1Power,
      socket2Power,
    );

    // Calculate average daily usage (based on available data)
    const averageDailyUsage = totalEnergy / 3; // Assuming 3 days of data for now

    setSummaryData({
      totalEnergy,
      totalCost,
      averageDailyUsage,
      peakPower,
      socket1Usage: socket1Energy,
      socket2Usage: socket2Energy,
      socket1Percentage,
      socket2Percentage,
    });
  };

  // Generate chart data based on time range and history
  const generateChartData = () => {
    if (energyHistory.length === 0) {
      return [];
    }

    const data = [];
    const now = new Date();

    if (timeRange === 'day') {
      // Last 24 hours data in 6-hour intervals
      const intervals = 4;
      for (let i = 0; i < intervals; i++) {
        const timeLabel = `${(18 - i * 6) % 24}:00`;
        const timePoint = new Date(now);
        timePoint.setHours(now.getHours() - i * 6);

        // Find records in this interval
        const relevantRecords = energyHistory.filter(
          record =>
            record.timestamp >=
              new Date(timePoint.getTime() - 6 * 60 * 60 * 1000) &&
            record.timestamp <= timePoint,
        );

        if (relevantRecords.length > 0) {
          // Use the latest record in the interval
          const latestRecord = relevantRecords[relevantRecords.length - 1];
          data.unshift({
            time: timeLabel,
            socket1:
              chartType === 'energy'
                ? latestRecord.socket1Energy
                : latestRecord.socket1Cost,
            socket2:
              chartType === 'energy'
                ? latestRecord.socket2Energy
                : latestRecord.socket2Cost,
          });
        } else {
          // No data for this interval
          data.unshift({
            time: timeLabel,
            socket1: 0,
            socket2: 0,
          });
        }
      }
    } else if (timeRange === 'week') {
      // Last 7 days data
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 0; i < 7; i++) {
        const dayIndex = (now.getDay() - i + 7) % 7;
        const dayName = dayNames[dayIndex];
        const dayStart = new Date(now);
        dayStart.setDate(now.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        // Find records for this day
        const relevantRecords = energyHistory.filter(
          record => record.timestamp >= dayStart && record.timestamp <= dayEnd,
        );

        if (relevantRecords.length > 0) {
          // Use the latest record for the day
          const latestRecord = relevantRecords[relevantRecords.length - 1];
          data.unshift({
            time: dayName,
            socket1:
              chartType === 'energy'
                ? latestRecord.socket1Energy
                : latestRecord.socket1Cost,
            socket2:
              chartType === 'energy'
                ? latestRecord.socket2Energy
                : latestRecord.socket2Cost,
          });
        } else {
          // No data for this day
          data.unshift({
            time: dayName,
            socket1: 0,
            socket2: 0,
          });
        }
      }
    } else if (timeRange === 'month') {
      // Last 4 weeks data
      for (let i = 0; i < 4; i++) {
        const weekLabel = `Week ${4 - i}`;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - i * 7 - 7);
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() - i * 7);

        // Find records for this week
        const relevantRecords = energyHistory.filter(
          record =>
            record.timestamp >= weekStart && record.timestamp <= weekEnd,
        );

        if (relevantRecords.length > 0) {
          // Use the latest record for the week
          const latestRecord = relevantRecords[relevantRecords.length - 1];
          data.unshift({
            time: weekLabel,
            socket1:
              chartType === 'energy'
                ? latestRecord.socket1Energy
                : latestRecord.socket1Cost,
            socket2:
              chartType === 'energy'
                ? latestRecord.socket2Energy
                : latestRecord.socket2Cost,
          });
        } else {
          // No data for this week
          data.unshift({
            time: weekLabel,
            socket1: 0,
            socket2: 0,
          });
        }
      }
    }

    return data;
  };

  // Render a simple chart using Views
  const renderSimpleChart = () => {
    const data = generateChartData();
    if (data.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Text style={styles.emptyChartText}>No data available</Text>
        </View>
      );
    }

    const maxValue = Math.max(
      ...data.map(item => Math.max(item.socket1, item.socket2)),
    );

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, {backgroundColor: '#3b82f6'}]} />
            <Text style={styles.legendText}>Socket 1</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, {backgroundColor: '#ef4444'}]} />
            <Text style={styles.legendText}>Socket 2</Text>
          </View>
        </View>

        <View style={styles.chart}>
          {data.map((item, index) => (
            <View key={index} style={styles.chartColumn}>
              <View style={styles.barContainer}>
                <View style={styles.barGroup}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${
                          maxValue > 0 ? (item.socket1 / maxValue) * 100 : 0
                        }%`,
                        backgroundColor: '#3b82f6',
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${
                          maxValue > 0 ? (item.socket2 / maxValue) * 100 : 0
                        }%`,
                        backgroundColor: '#ef4444',
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.barLabel}>{item.time}</Text>
            </View>
          ))}
        </View>

        <View style={styles.yAxis}>
          <Text style={styles.yAxisLabel}>
            {maxValue.toFixed(chartType === 'energy' ? 2 : 0)}
          </Text>
          <Text style={styles.yAxisLabel}>
            {(maxValue * 0.75).toFixed(chartType === 'energy' ? 2 : 0)}
          </Text>
          <Text style={styles.yAxisLabel}>
            {(maxValue * 0.5).toFixed(chartType === 'energy' ? 2 : 0)}
          </Text>
          <Text style={styles.yAxisLabel}>
            {(maxValue * 0.25).toFixed(chartType === 'energy' ? 2 : 0)}
          </Text>
          <Text style={styles.yAxisLabel}>0</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>Usage History</Text>
          </View>
          <View style={styles.timeRangeSelector}>
            <TouchableOpacity
              style={[
                styles.timeRangeButton,
                timeRange === 'day' && styles.activeTimeRange,
              ]}
              onPress={() => setTimeRange('day')}>
              <Text
                style={[
                  styles.timeRangeText,
                  timeRange === 'day' && styles.activeTimeRangeText,
                ]}>
                24h
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeRangeButton,
                timeRange === 'week' && styles.activeTimeRange,
              ]}
              onPress={() => setTimeRange('week')}>
              <Text
                style={[
                  styles.timeRangeText,
                  timeRange === 'week' && styles.activeTimeRangeText,
                ]}>
                Week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeRangeButton,
                timeRange === 'month' && styles.activeTimeRange,
              ]}
              onPress={() => setTimeRange('month')}>
              <Text
                style={[
                  styles.timeRangeText,
                  timeRange === 'month' && styles.activeTimeRangeText,
                ]}>
                Month
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.chartTypeSelector}>
          <TouchableOpacity
            style={[
              styles.chartTypeButton,
              chartType === 'energy' && styles.activeChartType,
            ]}
            onPress={() => setChartType('energy')}>
            <Text
              style={[
                styles.chartTypeText,
                chartType === 'energy' && styles.activeChartTypeText,
              ]}>
              Energy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chartTypeButton,
              chartType === 'cost' && styles.activeChartType,
            ]}
            onPress={() => setChartType('cost')}>
            <Text
              style={[
                styles.chartTypeText,
                chartType === 'cost' && styles.activeChartTypeText,
              ]}>
              Cost
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0070f3" />
          </View>
        ) : (
          renderSimpleChart()
        )}

        <View style={styles.chartFooter}>
          <Text style={styles.chartFooterText}>
            {chartType === 'energy' ? 'Energy (kWh)' : 'Cost (₦)'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>Usage Summary</Text>
          </View>
        </View>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Energy:</Text>
            <Text style={styles.summaryValue}>
              {summaryData.totalEnergy.toFixed(3)} kWh
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Cost:</Text>
            <Text style={styles.summaryValue}>
              ₦{summaryData.totalCost.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average Daily Usage:</Text>
            <Text style={styles.summaryValue}>
              {summaryData.averageDailyUsage.toFixed(3)} kWh
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Peak Power:</Text>
            <Text style={styles.summaryValue}>
              {summaryData.peakPower.toFixed(1)} W
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Socket 1 Usage:</Text>
            <Text style={styles.summaryValue}>
              {summaryData.socket1Usage.toFixed(3)} kWh (
              {summaryData.socket1Percentage.toFixed(1)}%)
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Socket 2 Usage:</Text>
            <Text style={styles.summaryValue}>
              {summaryData.socket2Usage.toFixed(3)} kWh (
              {summaryData.socket2Percentage.toFixed(1)}%)
            </Text>
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
  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    padding: 2,
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  activeTimeRange: {
    backgroundColor: '#0070f3',
  },
  timeRangeText: {
    fontSize: 12,
    color: '#666',
  },
  activeTimeRangeText: {
    color: 'white',
  },
  chartTypeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  chartTypeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeChartType: {
    borderBottomColor: '#0070f3',
  },
  chartTypeText: {
    fontSize: 14,
    color: '#666',
  },
  activeChartTypeText: {
    color: '#0070f3',
    fontWeight: 'bold',
  },
  chartContainer: {
    height: 220,
    marginHorizontal: 16,
    flexDirection: 'row',
  },
  emptyChartContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    color: '#666',
    fontStyle: 'italic',
  },
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  chart: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingLeft: 30, // Space for y-axis
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    height: 180,
    justifyContent: 'flex-end',
  },
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    width: 10,
    marginHorizontal: 2,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  yAxis: {
    width: 30,
    height: 180,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#666',
  },
  chartFooter: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  chartFooterText: {
    fontSize: 12,
    color: '#666',
  },
  summaryContainer: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#666',
  },
  summaryValue: {
    fontWeight: '500',
  },
});
