"use client";

import { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase";
import * as Notifications from "expo-notifications";
import * as Permissions from "expo-permissions";
import { doc, setDoc } from "firebase/firestore";

import LoginScreen from "@/screens/LoginScreen";
import SignupScreen from "@/screens/SignUpScreen";
import HomeScreen from "@/screens/HomeScreen";
import AppliancesScreen from "@/screens/AppliancesScreen";
import AnalyticsScreen from "@/screens/AnalyticsScreen";
import ScheduleScreen from "@/screens/ScheduleScreen";
import SettingsScreen from "@/screens/SettingsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Appliances") {
            iconName = focused ? "power" : "power-outline";
          } else if (route.name === "Analytics") {
            iconName = focused ? "bar-chart" : "bar-chart-outline";
          } else if (route.name === "Schedule") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Appliances" component={AppliancesScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (initializing) setInitializing(false);

      if (user) {
        await registerForPushNotifications(user.uid);
      }
    });

    // Set up notification listener
    const notificationListener =
      Notifications.addNotificationReceivedListener(handleNotification);

    return () => {
      unsubscribe();
      notificationListener.remove();
    };
  }, [initializing]);

  async function registerForPushNotifications(userId) {
    const { status } = await Permissions.askAsync(Permissions.NOTIFICATIONS);
    if (status !== "granted") {
      alert("You need to enable notifications for this app to work properly!");
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await setDoc(
      doc(db, "users", userId),
      { expoToken: token },
      { merge: true }
    );
  }

  function handleNotification(notification) {
    const { title, body } = notification.request.content;

    // Handle different types of notifications
    switch (title) {
      case "High Energy Consumption!":
        // You could navigate to the Analytics screen or show an alert
        console.log("High energy consumption detected:", body);
        break;
      case "Power Source Failure!":
        // You could show an alert or navigate to a specific screen
        console.log("Power source failure detected:", body);
        break;
      default:
        console.log("Received notification:", title, body);
    }
  }

  if (initializing) {
    // You can add a loading screen here if needed
    return null;
  }

  return (
    // <NavigationContainer>
    <Stack.Navigator>
      {user ? (
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      )}
    </Stack.Navigator>
    // </NavigationContainer>
  );
}
