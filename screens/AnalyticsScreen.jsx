import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useWebSocket } from "../utils/websocket";

export default function AnalyticsScreen() {
  const { data, error } = useWebSocket("ws://YOUR_RASPBERRY_PI_IP:8765");

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const chartData = {
    labels: Object.keys(data?.peak_hours || {}),
    datasets: [
      {
        data: Object.values(data?.peak_hours || {}),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Energy Consumption Analytics</Text>
      {data ? (
        <>
          <LineChart
            data={chartData}
            width={Dimensions.get("window").width - 40}
            height={220}
            yAxisLabel="W "
            chartConfig={{
              backgroundColor: "#e26a00",
              backgroundGradientFrom: "#fb8c00",
              backgroundGradientTo: "#ffa726",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: "6",
                strokeWidth: "2",
                stroke: "#ffa726",
              },
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
          />
          <View style={styles.appliancesContainer}>
            <Text style={styles.subtitle}>Appliance Status</Text>
            {Object.entries(data.appliances).map(([name, info]) => (
              <Text key={name} style={styles.applianceText}>
                {name}: {info.status ? "On" : "Off"} ({info.power}W)
              </Text>
            ))}
          </View>
        </>
      ) : (
        <Text>Loading analytics data...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  appliancesContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    width: "100%",
  },
  applianceText: {
    fontSize: 14,
    marginBottom: 5,
  },
  errorText: {
    color: "red",
    fontSize: 16,
  },
});
