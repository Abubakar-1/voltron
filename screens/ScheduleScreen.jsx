"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export default function ScheduleScreen() {
  const [schedules, setSchedules] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [currentAppliance, setCurrentAppliance] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "schedules"), (snapshot) => {
      const scheduleData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSchedules(scheduleData);
    });

    return () => unsubscribe();
  }, []);

  const addSchedule = (applianceId, time) => {
    addDoc(collection(db, "schedules"), {
      applianceId,
      time: serverTimestamp(),
    });
  };

  const renderItem = ({ item }) => (
    <View style={styles.scheduleItem}>
      <Text style={styles.applianceName}>{item.applianceName}</Text>
      <Text>{new Date(item.time.toDate()).toLocaleTimeString()}</Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setCurrentAppliance(item.applianceId);
          setShowPicker(true);
        }}
      >
        <Text style={styles.addButtonText}>Add Schedule</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Appliance Schedules</Text>
      <FlatList
        data={schedules}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
      {showPicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, selectedTime) => {
            setShowPicker(false);
            if (selectedTime) {
              addSchedule(currentAppliance, selectedTime);
            }
          }}
        />
      )}
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
  scheduleItem: {
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
    fontWeight: "bold",
    marginBottom: 5,
  },
  addButton: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  addButtonText: {
    color: "#fff",
    textAlign: "center",
  },
});
