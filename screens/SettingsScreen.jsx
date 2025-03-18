"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
} from "react-native";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function SettingsScreen() {
  const [settings, setSettings] = useState({
    electricityRate: "",
    notificationsEnabled: true,
    consumptionThreshold: "",
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "userSettings"),
      (doc) => {
        if (doc.exists()) {
          setSettings(doc.data());
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const updateSettings = () => {
    setDoc(doc(db, "settings", "userSettings"), settings);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Electricity Rate (Naira/kWh)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={settings.electricityRate}
          onChangeText={(text) =>
            setSettings({ ...settings, electricityRate: text })
          }
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Enable Notifications</Text>
        <Switch
          value={settings.notificationsEnabled}
          onValueChange={(value) =>
            setSettings({ ...settings, notificationsEnabled: value })
          }
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Consumption Threshold (kWh)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={settings.consumptionThreshold}
          onChangeText={(text) =>
            setSettings({ ...settings, consumptionThreshold: text })
          }
        />
      </View>
      <TouchableOpacity style={styles.saveButton} onPress={updateSettings}>
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </View>
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
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
