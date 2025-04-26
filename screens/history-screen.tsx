'use client';

import {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

export function HistoryScreen() {
  const [timeRange, setTimeRange] = useState('day');
  const [chartType, setChartType] = useState('energy');

  // Generate mock data based on time range
  const generateEnergyData = () => {
    let data = [];

    if (timeRange === 'day') {
      // Hourly data for 24 hours
      data = [
        {time: '00:00', socket1: 0.02, socket2: 0.03},
        {time: '06:00', socket1: 0.03, socket2: 0.05},
        {time: '12:00', socket1: 0.04, socket2: 0.07},
        {time: '18:00', socket1: 0.03, socket2: 0.06},
        {time: '24:00', socket1: 0.02, socket2: 0.04},
      ];
    } else if (timeRange === 'week') {
      // Daily data for a week
      data = [
        {time: 'Mon', socket1: 0.2, socket2: 0.3},
        {time: 'Tue', socket1: 0.3, socket2: 0.4},
        {time: 'Wed', socket1: 0.4, socket2: 0.5},
        {time: 'Thu', socket1: 0.3, socket2: 0.6},
        {time: 'Fri', socket1: 0.5, socket2: 0.7},
        {time: 'Sat', socket1: 0.4, socket2: 0.5},
        {time: 'Sun', socket1: 0.3, socket2: 0.4},
      ];
    } else if (timeRange === 'month') {
      // Weekly data for a month
      data = [
        {time: 'Week 1', socket1: 1.2, socket2: 1.8},
        {time: 'Week 2', socket1: 1.5, socket2: 2.1},
        {time: 'Week 3', socket1: 1.3, socket2: 1.9},
        {time: 'Week 4', socket1: 1.4, socket2: 2.0},
      ];
    }

    return data;
  };

  const generateCostData = () => {
    let data = [];

    if (timeRange === 'day') {
      data = [
        {time: '00:00', socket1: 4, socket2: 6},
        {time: '06:00', socket1: 6, socket2: 9},
        {time: '12:00', socket1: 8, socket2: 12},
        {time: '18:00', socket1: 7, socket2: 10},
        {time: '24:00', socket1: 5, socket2: 8},
      ];
    } else if (timeRange === 'week') {
      data = [
        {time: 'Mon', socket1: 40, socket2: 60},
        {time: 'Tue', socket1: 50, socket2: 75},
        {time: 'Wed', socket1: 60, socket2: 90},
        {time: 'Thu', socket1: 55, socket2: 85},
        {time: 'Fri', socket1: 70, socket2: 100},
        {time: 'Sat', socket1: 65, socket2: 95},
        {time: 'Sun', socket1: 45, socket2: 70},
      ];
    } else if (timeRange === 'month') {
      data = [
        {time: 'Week 1', socket1: 250, socket2: 380},
        {time: 'Week 2', socket1: 300, socket2: 450},
        {time: 'Week 3', socket1: 280, socket2: 420},
        {time: 'Week 4', socket1: 290, socket2: 430},
      ];
    }

    return data;
  };

  // Render a simple chart using Views instead of SVG
  const renderSimpleChart = () => {
    const data =
      chartType === 'energy' ? generateEnergyData() : generateCostData();
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
                        height: `${(item.socket1 / maxValue) * 100}%`,
                        backgroundColor: '#3b82f6',
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${(item.socket2 / maxValue) * 100}%`,
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
            <Icon name="clock" size={16} color="#0070f3" />
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

        {renderSimpleChart()}

        <View style={styles.chartFooter}>
          <Text style={styles.chartFooterText}>
            {chartType === 'energy' ? 'Energy (kWh)' : 'Cost (₦)'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Icon name="calendar" size={16} color="#0070f3" />
            <Text style={styles.cardTitle}>Usage Summary</Text>
          </View>
        </View>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Energy:</Text>
            <Text style={styles.summaryValue}>1.32 kWh</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Cost:</Text>
            <Text style={styles.summaryValue}>₦276.54</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average Daily Usage:</Text>
            <Text style={styles.summaryValue}>0.44 kWh</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Peak Power:</Text>
            <Text style={styles.summaryValue}>270.5 W</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Socket 1 Usage:</Text>
            <Text style={styles.summaryValue}>0.51 kWh (38.6%)</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Socket 2 Usage:</Text>
            <Text style={styles.summaryValue}>0.81 kWh (61.4%)</Text>
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
