'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import {Platform, PermissionsAndroid} from 'react-native';
import RNBluetoothClassic, {
  type BluetoothDevice,
  type BluetoothEventSubscription,
  type BluetoothNativeDevice,
} from 'react-native-bluetooth-classic';

// Define interfaces for our Bluetooth devices
interface BluetoothContextDevice {
  id: string;
  name: string;
  address: string;
}

interface BluetoothContextType {
  isConnected: boolean;
  isScanning: boolean;
  devices: BluetoothContextDevice[];
  unpairedDevices: BluetoothContextDevice[];
  connectedDevice: BluetoothContextDevice | null;
  scan: () => Promise<void>;
  scanForUnpaired: () => Promise<void>;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  sendCommand: (command: string) => Promise<void>;
  receivedData: string;
  clearReceivedData: () => void;
  pairDevice: (deviceId: string) => Promise<void>;
  lastUpdated: Date | null;
  reconnect: () => Promise<void>;
  connectionError: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  lastErrorTime: Date | null;
  signalStrength: number; // 0-100 signal strength indicator
  bufferedCommands: number; // Number of commands waiting in buffer
  setKeepAliveEnabled: (enabled: boolean) => void; // Control keep-alive
}

// Create the context with default values
const BluetoothContext = createContext<BluetoothContextType>({
  isConnected: false,
  isScanning: false,
  devices: [],
  unpairedDevices: [],
  connectedDevice: null,
  scan: async () => {},
  scanForUnpaired: async () => {},
  connect: async () => {},
  disconnect: async () => {},
  sendCommand: async () => {},
  receivedData: '',
  clearReceivedData: () => {},
  pairDevice: async () => {},
  lastUpdated: null,
  reconnect: async () => {},
  connectionError: null,
  connectionStatus: 'disconnected',
  lastErrorTime: null,
  signalStrength: 0,
  bufferedCommands: 0,
  setKeepAliveEnabled: () => {},
});

// Buffer item interface
interface BufferedCommand {
  command: string;
  timestamp: number;
  priority: 'high' | 'normal' | 'low';
  retries: number;
}

// Convert BluetoothNativeDevice to our context device format
const convertDevice = (
  device: BluetoothNativeDevice,
): BluetoothContextDevice => {
  return {
    id: device.address,
    name: device.name || 'Unknown Device',
    address: device.address,
  };
};

export function BluetoothProvider({children}: {children: ReactNode}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothContextDevice[]>([]);
  const [unpairedDevices, setUnpairedDevices] = useState<
    BluetoothContextDevice[]
  >([]);
  const [connectedDevice, setConnectedDevice] =
    useState<BluetoothContextDevice | null>(null);
  const [receivedData, setReceivedData] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'disconnected'
  >('disconnected');
  const [lastErrorTime, setLastErrorTime] = useState<Date | null>(null);
  const [signalStrength, setSignalStrength] = useState<number>(0);
  const [bufferedCommands, setBufferedCommands] = useState<number>(0);
  const [keepAliveEnabled, setKeepAliveEnabled] = useState<boolean>(true);

  // Track reconnection attempts to prevent infinite loops
  const reconnectionAttemptsRef = useRef(0);
  const maxReconnectionAttempts = 5;
  const reconnectingRef = useRef(false);

  // Connection stability tracking
  const connectionStateRef = useRef<boolean>(false);
  const connectionCheckCountRef = useRef<number>(0);
  const lastDisconnectTimeRef = useRef<number>(0);
  const stableConnectionThreshold = 3; // Number of successful checks before considering connection stable
  const connectionGracePeriod = 5000; // 5 seconds grace period before reconnecting

  // Data buffering
  const dataBufferRef = useRef<BufferedCommand[]>([]);
  const MAX_BUFFER_SIZE = 100;
  const MAX_BUFFER_AGE_MS = 300000; // 5 minutes
  const MAX_RETRIES = 3;

  // Flow control
  const transmissionInProgressRef = useRef<boolean>(false);
  const lastTransmissionTimeRef = useRef<number>(0);
  const minTransmissionIntervalMs = 50; // Minimum 50ms between transmissions

  // Signal strength tracking
  const rssiCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveTimeoutsRef = useRef<number>(0);
  const MAX_CONSECUTIVE_TIMEOUTS = 3;

  // Keep track of the last connected device ID for reconnection
  const lastConnectedDeviceIdRef = useRef<string | null>(null);

  // Keep track of data subscription
  const dataSubscriptionRef = useRef<BluetoothEventSubscription | null>(null);
  const connectedDeviceRef = useRef<BluetoothDevice | null>(null);

  // Keep-alive interval reference
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if we're running on a real device
  const isRealDevice = Platform.OS === 'android' || Platform.OS === 'ios';

  // Request Bluetooth permissions properly
  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        // For Android 12+ (API level 31+)
        if (Platform.Version >= 31) {
          const bluetoothScan = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            {
              title: 'Bluetooth Scan Permission',
              message:
                'This app needs permission to scan for Bluetooth devices.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );

          const bluetoothConnect = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            {
              title: 'Bluetooth Connect Permission',
              message:
                'This app needs permission to connect to Bluetooth devices.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );

          return (
            bluetoothScan === PermissionsAndroid.RESULTS.GRANTED &&
            bluetoothConnect === PermissionsAndroid.RESULTS.GRANTED
          );
        }
        // For Android 6.0+ (API level 23+) but below Android 12
        else if (Platform.Version >= 23) {
          const fineLocation = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message:
                'This app needs access to your location to scan for Bluetooth devices.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );

          return fineLocation === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (error) {
        console.error('Error requesting Bluetooth permissions:', error);
        return false;
      }
    }

    // iOS or older Android doesn't need runtime permissions
    return true;
  };

  // Start keep-alive mechanism
  const startKeepAlive = () => {
    // Clear any existing interval
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }

    if (!keepAliveEnabled) {
      return;
    }

    keepAliveIntervalRef.current = setInterval(() => {
      if (isConnected && connectedDeviceRef.current) {
        // Send a small keep-alive packet that won't interfere with normal operation
        sendCommand('PING', 'low').catch(err => {
          console.log('Keep-alive failed:', err);
        });
      }
    }, 15000); // Every 15 seconds

    return () => {
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
    };
  };

  // Check signal strength periodically
  const startSignalStrengthMonitoring = () => {
    if (rssiCheckIntervalRef.current) {
      clearInterval(rssiCheckIntervalRef.current);
    }

    rssiCheckIntervalRef.current = setInterval(async () => {
      if (
        isConnected &&
        connectedDeviceRef.current &&
        Platform.OS === 'android'
      ) {
        try {
          // This is Android-specific and may not be available on all devices
          const rssi = await connectedDeviceRef.current.getRssi?.();
          if (rssi !== undefined) {
            // RSSI typically ranges from -100 (very weak) to 0 (very strong)
            // Convert to a 0-100 scale for easier understanding
            const strengthPercent = Math.max(
              0,
              Math.min(100, Math.round((rssi + 100) * 1.25)),
            );
            setSignalStrength(strengthPercent);

            // Reset timeout counter on successful RSSI check
            consecutiveTimeoutsRef.current = 0;
          }
        } catch (error) {
          console.log('Error getting RSSI:', error);
          consecutiveTimeoutsRef.current++;

          // If we have too many consecutive timeouts, the connection might be unstable
          if (consecutiveTimeoutsRef.current >= MAX_CONSECUTIVE_TIMEOUTS) {
            console.log(
              'Multiple RSSI check failures, connection may be unstable',
            );
            setSignalStrength(prev => Math.max(0, prev - 20)); // Decrease signal strength indicator
          }
        }
      } else {
        setSignalStrength(0);
      }
    }, 10000); // Check every 10 seconds

    return () => {
      if (rssiCheckIntervalRef.current) {
        clearInterval(rssiCheckIntervalRef.current);
        rssiCheckIntervalRef.current = null;
      }
    };
  };

  // Process buffered commands
  const processBufferedCommands = async () => {
    if (
      dataBufferRef.current.length === 0 ||
      !isConnected ||
      transmissionInProgressRef.current
    ) {
      return;
    }

    // Sort by priority (high first) and then by timestamp (oldest first)
    const sortedBuffer = [...dataBufferRef.current].sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority === 'high'
          ? -1
          : b.priority === 'high'
          ? 1
          : a.priority === 'normal'
          ? -1
          : 1;
      }
      return a.timestamp - b.timestamp;
    });

    // Process the next command
    const nextCommand = sortedBuffer[0];

    // Check if we need to wait before sending (flow control)
    const now = Date.now();
    const timeSinceLastTransmission = now - lastTransmissionTimeRef.current;
    if (timeSinceLastTransmission < minTransmissionIntervalMs) {
      // Schedule retry after the minimum interval
      setTimeout(
        processBufferedCommands,
        minTransmissionIntervalMs - timeSinceLastTransmission,
      );
      return;
    }

    // Remove from buffer
    dataBufferRef.current = dataBufferRef.current.filter(
      cmd =>
        cmd.command !== nextCommand.command ||
        cmd.timestamp !== nextCommand.timestamp,
    );
    setBufferedCommands(dataBufferRef.current.length);

    // Send the command
    transmissionInProgressRef.current = true;
    try {
      if (isRealDevice && connectedDeviceRef.current) {
        // Add newline if needed
        const formattedCommand = nextCommand.command.endsWith('\n')
          ? nextCommand.command
          : nextCommand.command + '\n';

        await connectedDeviceRef.current.write(formattedCommand);
        lastTransmissionTimeRef.current = Date.now();

        // Successful command indicates good connection
        if (nextCommand.priority !== 'low') {
          // Don't count keep-alive pings
          connectionCheckCountRef.current = stableConnectionThreshold;
        }
      }
    } catch (error) {
      console.error('Error sending buffered command:', error);

      // If it's a high priority command or hasn't been retried too many times, add it back to the buffer
      if (
        nextCommand.retries < MAX_RETRIES &&
        (nextCommand.priority === 'high' || nextCommand.priority === 'normal')
      ) {
        dataBufferRef.current.push({
          ...nextCommand,
          retries: nextCommand.retries + 1,
        });
        setBufferedCommands(dataBufferRef.current.length);
      }

      // Check connection status
      if (connectedDeviceRef.current) {
        try {
          const stillConnected = await connectedDeviceRef.current.isConnected();
          if (!stillConnected && isConnected) {
            handleDisconnection('Connection lost while sending command');
          }
        } catch (err) {
          console.error('Error checking connection after send failure:', err);
        }
      }
    } finally {
      transmissionInProgressRef.current = false;

      // Process next command if there are more in the buffer
      if (dataBufferRef.current.length > 0) {
        // Add a small delay for flow control
        setTimeout(processBufferedCommands, minTransmissionIntervalMs);
      }
    }
  };

  // Handle disconnection with proper error message
  const handleDisconnection = (errorMessage: string) => {
    // Update connection state
    connectionStateRef.current = false;
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setConnectionError(errorMessage);
    setLastErrorTime(new Date());

    // Record the time of disconnection
    lastDisconnectTimeRef.current = Date.now();

    // Wait for grace period before attempting reconnection
    if (!reconnectingRef.current) {
      console.log(
        'Connection lost, waiting for grace period before reconnecting...',
      );
      setTimeout(() => {
        // Only reconnect if we're still disconnected after the grace period
        if (!connectionStateRef.current && !reconnectingRef.current) {
          console.log('Grace period ended, attempting reconnection');
          reconnect();
        }
      }, connectionGracePeriod);
    }
  };

  // Reset reconnection attempts counter when successfully connected
  useEffect(() => {
    if (isConnected) {
      reconnectionAttemptsRef.current = 0;
      reconnectingRef.current = false;
      connectionStateRef.current = true;

      // Start keep-alive when connected
      startKeepAlive();

      // Start signal strength monitoring
      startSignalStrengthMonitoring();

      // Process any buffered commands
      if (dataBufferRef.current.length > 0) {
        processBufferedCommands();
      }
    } else {
      connectionStateRef.current = false;

      // Clear keep-alive when disconnected
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }

      // Clear signal strength monitoring
      if (rssiCheckIntervalRef.current) {
        clearInterval(rssiCheckIntervalRef.current);
        rssiCheckIntervalRef.current = null;
      }
    }

    return () => {
      // Clean up intervals
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
      if (rssiCheckIntervalRef.current) {
        clearInterval(rssiCheckIntervalRef.current);
      }
    };
  }, [isConnected, keepAliveEnabled]);

  // Check connection status periodically with debouncing
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isConnected) {
      interval = setInterval(async () => {
        try {
          // Only run this check on actual devices
          if (isRealDevice && connectedDeviceRef.current) {
            const stillConnected =
              await connectedDeviceRef.current.isConnected();

            if (stillConnected) {
              // Increment successful connection check count
              connectionCheckCountRef.current++;

              // If we've had enough successful checks, consider the connection stable
              if (
                connectionCheckCountRef.current >= stableConnectionThreshold
              ) {
                // Only update UI state if there was a change to avoid re-renders
                if (!isConnected) {
                  setIsConnected(true);
                  setConnectionStatus('connected');
                  setConnectionError(null);
                }
              }
            } else {
              // Reset the successful check counter
              connectionCheckCountRef.current = 0;

              // Handle disconnection with grace period
              if (isConnected) {
                handleDisconnection('Connection lost. Waiting to reconnect...');
              }
            }
          }
        } catch (error) {
          console.error('Error checking connection status:', error);
          connectionCheckCountRef.current = 0;
        }
      }, 5000); // Check every 5 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isConnected]);

  // Modify the setupDataListener function to add detailed logging
  const setupDataListener = (device: BluetoothDevice) => {
    // Remove any existing subscription
    if (dataSubscriptionRef.current) {
      dataSubscriptionRef.current.remove();
    }

    // Set up new data listener
    dataSubscriptionRef.current = device.onDataReceived(data => {
      // Receiving data is a good indicator of an active connection
      connectionCheckCountRef.current = stableConnectionThreshold;

      // Update signal strength on data receipt for more responsive UI
      setSignalStrength(prev => Math.min(100, prev + 5));

      // Log received data in detail
      console.log('📥 RECEIVED DATA:', {
        rawData: data.data,
        hexData: Array.from(data.data)
          .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join(' '),
        timestamp: new Date().toISOString(),
      });

      // Parse commands if they contain newlines
      if (data.data.includes('\n')) {
        const lines = data.data.split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            console.log('📌 PARSED COMMAND:', line.trim());

            // Process specific commands
            if (line.startsWith('POWER:')) {
              const powerValue = parseFloat(line.substring(6));
              console.log(
                '💡 POWER STATE:',
                powerValue > 0 ? 'ON' : 'OFF',
                powerValue,
              );
              // You could dispatch an event or update state here
            } else if (line.startsWith('ENERGY:')) {
              const energyValue = parseFloat(line.substring(7));
              console.log('⚡ ENERGY VALUE:', energyValue);
            } else if (line.startsWith('COST:')) {
              const costValue = parseFloat(line.substring(5));
              console.log('💰 COST VALUE:', costValue);
            }
          }
        });
      }

      // Update the received data state
      setReceivedData(prev => prev + data.data);
      setLastUpdated(new Date());

      // Ensure connection state is updated if we're receiving data
      if (!isConnected) {
        setIsConnected(true);
        setConnectionStatus('connected');
        setConnectionError(null);
      }

      // Reset consecutive timeouts since we're receiving data
      consecutiveTimeoutsRef.current = 0;
    });
  };

  useEffect(() => {
    // Check if Bluetooth is enabled when the app starts
    const checkBluetooth = async () => {
      try {
        if (isRealDevice) {
          console.log('Checking Bluetooth status...');

          // Request permissions first
          const permissionsGranted = await requestBluetoothPermissions();
          if (!permissionsGranted) {
            console.log('Bluetooth permissions not granted');
            setConnectionError(
              'Bluetooth permissions not granted. Please grant permissions in app settings.',
            );
            setLastErrorTime(new Date());
            return;
          }

          try {
            const enabled = await RNBluetoothClassic.isBluetoothEnabled();
            console.log('Bluetooth enabled:', enabled);

            if (!enabled) {
              try {
                // Try to enable Bluetooth
                await RNBluetoothClassic.requestBluetoothEnabled();
                console.log('Bluetooth has been enabled');
              } catch (error) {
                console.log('Please enable Bluetooth to use this app');
                setConnectionError('Please enable Bluetooth to use this app');
                setLastErrorTime(new Date());
              }
            }
          } catch (error) {
            console.error('Error checking Bluetooth status:', error);
            setConnectionError(
              'Error checking Bluetooth status. Please ensure Bluetooth is available.',
            );
            setLastErrorTime(new Date());
          }
        }
      } catch (error) {
        console.error('Error in checkBluetooth:', error);
      }
    };

    // Call the function
    checkBluetooth();

    return () => {
      // Clean up listeners when component unmounts
      if (dataSubscriptionRef.current) {
        dataSubscriptionRef.current.remove();
      }

      // Disconnect if connected
      if (isConnected && connectedDeviceRef.current) {
        connectedDeviceRef.current
          .disconnect()
          .catch(error => console.error('Error disconnecting:', error));
      }

      // Clear intervals
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
      if (rssiCheckIntervalRef.current) {
        clearInterval(rssiCheckIntervalRef.current);
      }
    };
  }, []);

  const scan = async () => {
    try {
      setIsScanning(true);
      setConnectionError(null);
      console.log('Starting Bluetooth scan...');

      if (isRealDevice) {
        // Request permissions first
        const permissionsGranted = await requestBluetoothPermissions();
        if (!permissionsGranted) {
          console.log('Bluetooth permissions not granted');
          setConnectionError(
            'Bluetooth permissions not granted. Please grant permissions in app settings.',
          );
          setLastErrorTime(new Date());
          setIsScanning(false);
          return;
        }

        try {
          // Check if Bluetooth is enabled
          const enabled = await RNBluetoothClassic.isBluetoothEnabled();
          if (!enabled) {
            try {
              await RNBluetoothClassic.requestBluetoothEnabled();
              console.log('Bluetooth has been enabled');
            } catch (error) {
              console.log('Please enable Bluetooth to scan for devices');
              setConnectionError('Please enable Bluetooth to scan for devices');
              setLastErrorTime(new Date());
              setIsScanning(false);
              return;
            }
          }

          // Get list of paired devices
          console.log('Getting bonded devices...');
          const deviceList = await RNBluetoothClassic.getBondedDevices();
          console.log('Got bonded devices:', deviceList.length);

          const convertedDevices = deviceList.map(convertDevice);
          setDevices(convertedDevices);

          console.log(`Found ${deviceList.length} paired devices`);
        } catch (error) {
          console.error('Error in real device scan:', error);
          setConnectionError(
            'Failed to scan for devices: ' +
              (error instanceof Error ? error.message : String(error)),
          );
          setLastErrorTime(new Date());
        }
      }
    } catch (error) {
      console.error('Error scanning for devices:', error);
      setConnectionError('Failed to scan for devices');
      setLastErrorTime(new Date());
    } finally {
      setIsScanning(false);
    }
  };

  const scanForUnpaired = async () => {
    try {
      setIsScanning(true);
      setConnectionError(null);
      console.log('Starting discovery for unpaired devices...');

      if (isRealDevice) {
        // Request permissions first
        const permissionsGranted = await requestBluetoothPermissions();
        if (!permissionsGranted) {
          console.log('Bluetooth permissions not granted');
          setConnectionError(
            'Bluetooth permissions not granted. Please grant permissions in app settings.',
          );
          setLastErrorTime(new Date());
          setIsScanning(false);
          return;
        }

        try {
          // Check if Bluetooth is enabled
          const enabled = await RNBluetoothClassic.isBluetoothEnabled();
          if (!enabled) {
            try {
              await RNBluetoothClassic.requestBluetoothEnabled();
            } catch (error) {
              console.log('Please enable Bluetooth to scan for devices');
              setConnectionError('Please enable Bluetooth to scan for devices');
              setLastErrorTime(new Date());
              setIsScanning(false);
              return;
            }
          }

          // Clear previous unpaired devices
          setUnpairedDevices([]);

          // Start discovery
          console.log('Starting discovery...');

          // Set up discovery listener
          const discoverySubscription = RNBluetoothClassic.onDeviceDiscovered(
            device => {
              console.log('Device discovered:', device.name || device.address);
              setUnpairedDevices(prev => {
                // Check if device already exists in the list
                if (prev.some(d => d.id === device.address)) {
                  return prev;
                }
                return [...prev, convertDevice(device)];
              });
            },
          );

          // Start the discovery process
          await RNBluetoothClassic.startDiscovery();

          // Stop discovery after 10 seconds
          setTimeout(async () => {
            try {
              await RNBluetoothClassic.cancelDiscovery();
              discoverySubscription.remove();
              setIsScanning(false);
              console.log('Discovery completed');
            } catch (error) {
              console.error('Error canceling discovery:', error);
              setIsScanning(false);
            }
          }, 10000);
        } catch (error) {
          console.error('Error in real device discovery:', error);
          setConnectionError(
            'Failed to discover devices: ' +
              (error instanceof Error ? error.message : String(error)),
          );
          setLastErrorTime(new Date());
          setIsScanning(false);
        }
      }
    } catch (error) {
      console.error('Error discovering unpaired devices:', error);
      setConnectionError('Failed to discover unpaired devices');
      setLastErrorTime(new Date());
      setIsScanning(false);
    }
  };

  const pairDevice = async (deviceId: string) => {
    try {
      setConnectionError(null);
      console.log('Attempting to pair with device:', deviceId);

      if (isRealDevice) {
        // Request permissions first
        const permissionsGranted = await requestBluetoothPermissions();
        if (!permissionsGranted) {
          console.log('Bluetooth permissions not granted');
          setConnectionError(
            'Bluetooth permissions not granted. Please grant permissions in app settings.',
          );
          setLastErrorTime(new Date());
          return;
        }

        try {
          // Find the device in the unpaired list
          const device = unpairedDevices.find(d => d.id === deviceId);
          if (!device) {
            throw new Error('Device not found');
          }

          // In react-native-bluetooth-classic, pairing is done through the Android settings
          // We can only attempt to connect, which will prompt for pairing if needed
          console.log('Connecting to device to initiate pairing...');
          const btDevice = await RNBluetoothClassic.connectToDevice(deviceId);
          console.log('Connected for pairing');

          // Disconnect after pairing
          await btDevice.disconnect();
          console.log('Disconnected after pairing');

          // Refresh the list of paired devices
          await scan();

          console.log('Device has been paired successfully');
        } catch (error) {
          console.error('Error in real device pairing:', error);
          setConnectionError(
            'Failed to pair with device: ' +
              (error instanceof Error ? error.message : String(error)),
          );
          setLastErrorTime(new Date());
        }
      }
    } catch (error) {
      console.error('Error pairing device:', error);
      setConnectionError('Failed to pair with device');
      setLastErrorTime(new Date());
    }
  };

  const connect = async (deviceId: string) => {
    try {
      // Reset connection check counter
      connectionCheckCountRef.current = 0;

      setConnectionError(null);
      setConnectionStatus('connecting');
      console.log('Connecting to device:', deviceId);

      // Request permissions first
      const permissionsGranted = await requestBluetoothPermissions();
      if (!permissionsGranted) {
        console.log('Bluetooth permissions not granted');
        setConnectionError(
          'Bluetooth permissions not granted. Please grant permissions in app settings.',
        );
        setLastErrorTime(new Date());
        setConnectionStatus('disconnected');
        return;
      }

      // Find the device in the list
      const device = devices.find(d => d.id === deviceId);
      if (!device) {
        throw new Error('Device not found');
      }

      if (isRealDevice) {
        try {
          // Connect to the device
          console.log('Attempting to connect to real device...');
          const btDevice = await RNBluetoothClassic.connectToDevice(deviceId, {
            // Add connection options to improve stability
            delimiter: '\n', // Line delimiter for data
            charset: 'utf-8', // Character set
            connectionOptions: {
              // Android-specific options
              CONNECTOR_TYPE: 'rfcomm',
              SECURE_SOCKET: true,
              CONNECTION_PRIORITY: 1, // Request high priority connection
            },
          });
          console.log('Connected to device');

          // On Android, request high priority connection
          if (Platform.OS === 'android') {
            try {
              // This is a method that might be available on some Android devices
              await btDevice.requestConnectionPriority?.('high');
            } catch (error) {
              console.log('Could not request high priority:', error);
            }
          }

          connectedDeviceRef.current = btDevice;

          // Store the device ID for reconnection
          lastConnectedDeviceIdRef.current = deviceId;

          // Setup data listener
          setupDataListener(btDevice);

          // Update connection state
          connectionStateRef.current = true;
          setIsConnected(true);
          setConnectionStatus('connected');
          setConnectedDevice(device);
          setSignalStrength(50); // Start with medium signal strength until we get real data

          // Clear any previous received data
          setReceivedData('');
          setLastUpdated(new Date());

          console.log(`Connected to ${device.name || device.address}`);

          // Start keep-alive
          startKeepAlive();

          // Start signal strength monitoring
          startSignalStrengthMonitoring();

          // Send STATUS command to get initial state after a short delay
          setTimeout(() => {
            sendCommand('STATUS', 'high').catch(error => {
              console.error('Error sending initial STATUS command:', 'high');
              console.error('Error sending initial STATUS command:', error);
            });
          }, 1000);
        } catch (error) {
          console.error('Error in real device connection:', error);
          setConnectionError(
            'Failed to connect: ' +
              (error instanceof Error ? error.message : String(error)),
          );
          setLastErrorTime(new Date());
          setConnectionStatus('disconnected');
        }
      }
    } catch (error) {
      console.error('Error connecting to device:', error);
      setConnectionError(
        `Failed to connect: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      setLastErrorTime(new Date());
      setConnectionStatus('disconnected');
    }
  };

  const reconnect = async () => {
    // Prevent multiple simultaneous reconnection attempts
    if (reconnectingRef.current) {
      console.log('Reconnection already in progress, skipping');
      return;
    }

    reconnectingRef.current = true;

    const deviceId = lastConnectedDeviceIdRef.current;
    if (!deviceId) {
      setConnectionError('No previous connection to reconnect to');
      setLastErrorTime(new Date());
      reconnectingRef.current = false;
      return;
    }

    // Check if we've exceeded the maximum number of reconnection attempts
    if (reconnectionAttemptsRef.current >= maxReconnectionAttempts) {
      console.log(
        `Maximum reconnection attempts (${maxReconnectionAttempts}) reached`,
      );
      setConnectionError(
        `Failed to reconnect after ${maxReconnectionAttempts} attempts. Please try manually connecting.`,
      );
      setLastErrorTime(new Date());
      reconnectingRef.current = false;
      return;
    }

    reconnectionAttemptsRef.current++;

    try {
      console.log(
        `Attempting to reconnect... (Attempt ${reconnectionAttemptsRef.current}/${maxReconnectionAttempts})`,
      );
      setConnectionStatus('connecting');

      // Request permissions first
      const permissionsGranted = await requestBluetoothPermissions();
      if (!permissionsGranted) {
        console.log('Bluetooth permissions not granted');
        setConnectionError(
          'Bluetooth permissions not granted. Please grant permissions in app settings.',
        );
        setLastErrorTime(new Date());
        setConnectionStatus('disconnected');
        reconnectingRef.current = false;
        return;
      }

      // Try to connect
      try {
        // Connect to the device
        const device = devices.find(d => d.id === deviceId);
        if (!device) {
          throw new Error('Device not found');
        }

        const btDevice = await RNBluetoothClassic.connectToDevice(deviceId, {
          // Add connection options to improve stability
          delimiter: '\n', // Line delimiter for data
          charset: 'utf-8', // Character set
          connectionOptions: {
            // Android-specific options
            CONNECTOR_TYPE: 'rfcomm',
            SECURE_SOCKET: true,
            CONNECTION_PRIORITY: 1, // Request high priority connection
          },
        });

        // On Android, request high priority connection
        if (Platform.OS === 'android') {
          try {
            await btDevice.requestConnectionPriority?.('high');
          } catch (error) {
            console.log('Could not request high priority:', error);
          }
        }

        connectedDeviceRef.current = btDevice;

        // Setup data listener
        setupDataListener(btDevice);

        // Update connection state
        connectionStateRef.current = true;
        setIsConnected(true);
        setConnectionStatus('connected');
        setConnectedDevice(device);
        setConnectionError(null);
        setSignalStrength(50); // Start with medium signal strength

        console.log('Reconnected successfully');

        // Start keep-alive
        startKeepAlive();

        // Start signal strength monitoring
        startSignalStrengthMonitoring();

        // Send STATUS command to refresh all state information after a short delay
        setTimeout(() => {
          sendCommand('STATUS', 'high').catch(error => {
            console.error('Error sending STATUS after reconnect:', error);
          });
        }, 1000);

        // Process any buffered commands
        if (dataBufferRef.current.length > 0) {
          setTimeout(processBufferedCommands, 2000);
        }

        // Reset reconnection attempts on success
        reconnectionAttemptsRef.current = 0;
        reconnectingRef.current = false;

        return; // Success, exit the function
      } catch (error) {
        console.error('Reconnection failed:', error);

        // Schedule another reconnection attempt with exponential backoff
        const backoffTime = Math.min(
          5000 * Math.pow(2, reconnectionAttemptsRef.current - 1),
          60000,
        );
        console.log(`Scheduling next reconnection attempt in ${backoffTime}ms`);

        setConnectionStatus('disconnected');

        setTimeout(() => {
          reconnectingRef.current = false;
          reconnect();
        }, backoffTime);
      }
    } catch (error) {
      console.error('Error in reconnect function:', error);
      setConnectionError('Failed to reconnect');
      setLastErrorTime(new Date());
      setConnectionStatus('disconnected');
      reconnectingRef.current = false;
    }
  };

  const disconnect = async () => {
    try {
      setConnectionError(null);
      console.log('Disconnecting from device...');

      if (isRealDevice && connectedDeviceRef.current) {
        try {
          await connectedDeviceRef.current.disconnect();
          console.log('Disconnected from real device');
        } catch (error) {
          console.error('Error disconnecting from real device:', error);
          setConnectionError(
            'Failed to disconnect: ' +
              (error instanceof Error ? error.message : String(error)),
          );
          setLastErrorTime(new Date());
        }
      }

      // Update connection state
      connectionStateRef.current = false;
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setConnectedDevice(null);
      connectedDeviceRef.current = null;
      setSignalStrength(0);

      // Reset reconnection attempts when manually disconnecting
      reconnectionAttemptsRef.current = 0;
      reconnectingRef.current = false;
      connectionCheckCountRef.current = 0;

      // Clear keep-alive
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }

      // Clear signal strength monitoring
      if (rssiCheckIntervalRef.current) {
        clearInterval(rssiCheckIntervalRef.current);
        rssiCheckIntervalRef.current = null;
      }

      console.log('Disconnected from the device');
    } catch (error) {
      console.error('Error disconnecting:', error);
      setConnectionError('Failed to disconnect');
      setLastErrorTime(new Date());
    }
  };

  const sendCommand = async (
    command: string,
    priority: 'high' | 'normal' | 'low' = 'normal',
  ) => {
    // Log the outgoing command with details
    console.log('📤 SENDING COMMAND:', {
      command,
      priority,
      timestamp: new Date().toISOString(),
      connectionState: isConnected ? 'connected' : 'disconnected',
    });

    // Always buffer the command first
    const bufferedCommand: BufferedCommand = {
      command,
      timestamp: Date.now(),
      priority,
      retries: 0,
    };

    // Add to buffer
    dataBufferRef.current.push(bufferedCommand);

    // Trim buffer if it gets too large (remove oldest low priority commands first)
    if (dataBufferRef.current.length > MAX_BUFFER_SIZE) {
      // Find low priority commands
      const lowPriorityCommands = dataBufferRef.current.filter(
        cmd => cmd.priority === 'low',
      );

      if (lowPriorityCommands.length > 0) {
        // Remove the oldest low priority command
        const oldestLowPriority = lowPriorityCommands.reduce(
          (oldest, current) =>
            current.timestamp < oldest.timestamp ? current : oldest,
          lowPriorityCommands[0],
        );

        dataBufferRef.current = dataBufferRef.current.filter(
          cmd =>
            cmd.command !== oldestLowPriority.command ||
            cmd.timestamp !== oldestLowPriority.timestamp,
        );
      } else {
        // If no low priority commands, remove the oldest normal priority
        const normalPriorityCommands = dataBufferRef.current.filter(
          cmd => cmd.priority === 'normal',
        );

        if (normalPriorityCommands.length > 0) {
          const oldestNormalPriority = normalPriorityCommands.reduce(
            (oldest, current) =>
              current.timestamp < oldest.timestamp ? current : oldest,
            normalPriorityCommands[0],
          );

          dataBufferRef.current = dataBufferRef.current.filter(
            cmd =>
              cmd.command !== oldestNormalPriority.command ||
              cmd.timestamp !== oldestNormalPriority.timestamp,
          );
        } else {
          // If only high priority commands, remove the oldest one
          dataBufferRef.current.sort((a, b) => a.timestamp - b.timestamp);
          dataBufferRef.current.shift();
        }
      }
    }

    // Update buffered commands count
    setBufferedCommands(dataBufferRef.current.length);

    // If not connected, just keep in buffer for later
    if (!isConnected) {
      console.log('Not connected, command buffered for later sending');
      return Promise.reject(new Error('Not connected'));
    }

    // Process the buffer (will send commands if connected)
    processBufferedCommands();

    // Return a promise that resolves when the command is processed
    // This is a bit of a simplification as we don't track individual commands
    return Promise.resolve();
  };

  const clearReceivedData = () => {
    setReceivedData('');
  };

  return (
    <BluetoothContext.Provider
      value={{
        isConnected,
        isScanning,
        devices,
        unpairedDevices,
        connectedDevice,
        scan,
        scanForUnpaired,
        connect,
        disconnect,
        sendCommand,
        receivedData,
        clearReceivedData,
        pairDevice,
        lastUpdated,
        reconnect,
        connectionError,
        connectionStatus,
        lastErrorTime,
        signalStrength,
        bufferedCommands,
        setKeepAliveEnabled,
      }}>
      {children}
    </BluetoothContext.Provider>
  );
}

export function useBluetooth() {
  return useContext(BluetoothContext);
}
