import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useWebSocket } from "../utils/websocket";

export default function HomeScreen() {
  const { data, error } = useWebSocket("ws://YOUR_RASPBERRY_PI_IP:8765");

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>VOLTRON</Text>
      <Text style={styles.subtitle}>Energy Management System</Text>
      {data ? (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Grid Power: {data.grid_power.toFixed(2)} W
          </Text>
          <Text style={styles.infoText}>
            Solar Power: {data.solar_power.toFixed(2)} W
          </Text>
          <Text style={styles.infoText}>
            Home Consumption: {data.home_consumption.toFixed(2)} W
          </Text>
          <Text style={styles.infoText}>
            Energy Cost: ₦{data.energy_cost.toFixed(2)}/s
          </Text>
          <Text style={styles.subtitle}>Active Appliances</Text>
          {Object.entries(data.appliances).map(
            ([name, info]) =>
              info.status && (
                <Text key={name} style={styles.applianceText}>
                  {name}: {info.power}W
                </Text>
              )
          )}
        </View>
      ) : (
        <Text>Loading energy data...</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f0f0f0",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 10,
    marginTop: 20,
  },
  infoContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 10,
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
