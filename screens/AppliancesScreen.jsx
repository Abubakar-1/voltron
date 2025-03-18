import { View, Text, StyleSheet, Switch, ScrollView } from "react-native";
import { useWebSocket } from "../utils/websocket";

export default function AppliancesScreen() {
  const { data, error, sendMessage } = useWebSocket(
    "ws://YOUR_RASPBERRY_PI_IP:8765"
  );

  const toggleAppliance = (applianceName, newStatus) => {
    sendMessage({
      type: "control_appliance",
      appliance: applianceName,
      status: newStatus,
    });
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Appliances</Text>
      {data && data.appliances ? (
        Object.entries(data.appliances).map(([name, info]) => (
          <View key={name} style={styles.applianceItem}>
            <Text style={styles.applianceName}>{name}</Text>
            <View style={styles.applianceInfo}>
              <Text>{info.power}W</Text>
              <Switch
                value={info.status}
                onValueChange={(newStatus) => toggleAppliance(name, newStatus)}
              />
            </View>
          </View>
        ))
      ) : (
        <Text>Loading appliances...</Text>
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
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  applianceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  applianceName: {
    fontSize: 18,
  },
  applianceInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    color: "red",
    fontSize: 16,
  },
});
