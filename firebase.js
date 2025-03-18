import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ Corrected storageBucket
const firebaseConfig = {
  apiKey: "AIzaSyBm44rneA2JMSIooIHf5LX7FK7AifxtaKg",
  authDomain: "voltron-f62e0.firebaseapp.com",
  projectId: "voltron-f62e0",
  storageBucket: "voltron-f62e0.appspot.com", // ✅ FIXED
  messagingSenderId: "946796983752",
  appId: "1:946796983752:web:f62b9ffebd07318aca3cfd",
  measurementId: "G-BET9G4FF79",
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
const db = getFirestore(app);

export { auth, app, db };
