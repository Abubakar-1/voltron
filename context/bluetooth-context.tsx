'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import {Platform} from 'react-native';
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
});

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

  // Keep track of the last connected device ID for reconnection
  const lastConnectedDeviceIdRef = useRef<string | null>(null);

  // Keep track of data subscription
  const dataSubscriptionRef = useRef<BluetoothEventSubscription | null>(null);
  const connectedDeviceRef = useRef<BluetoothDevice | null>(null);

  // Check if we're running on a real device
  const isRealDevice = Platform.OS === 'android' || Platform.OS === 'ios';

  // Get mock implementation
  // const { mockDevices, mockUnpairedDevices } = createMockBluetoothImplementation()

  // Initialize with mock data for development
  // useEffect(() => {
  //   // In a real app, you would check if Bluetooth is available
  //   console.log("Initializing Bluetooth context")

  //   // Set mock devices for development
  //   setDevices(mockDevices)
  // }, [])

  // Check connection status periodically
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isConnected) {
      interval = setInterval(async () => {
        try {
          // Only run this check on actual devices
          if (isRealDevice && connectedDeviceRef.current) {
            const stillConnected =
              await connectedDeviceRef.current.isConnected();

            if (!stillConnected && isConnected) {
              setIsConnected(false);
              setConnectionError('Connection lost. Attempting to reconnect...');

              // Try to reconnect
              reconnect();
            }
          }
        } catch (error) {
          console.error('Error checking connection status:', error);
        }
      }, 5000); // Check every 5 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isConnected]);

  // Setup data listener
  const setupDataListener = (device: BluetoothDevice) => {
    // Remove any existing subscription
    if (dataSubscriptionRef.current) {
      dataSubscriptionRef.current.remove();
    }

    // Set up new data listener
    dataSubscriptionRef.current = device.onDataReceived(data => {
      setReceivedData(prev => prev + data.data);
      setLastUpdated(new Date());
    });
  };

  useEffect(() => {
    // Check if Bluetooth is enabled when the app starts
    const checkBluetooth = async () => {
      try {
        if (isRealDevice) {
          console.log('Checking Bluetooth status...');

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
              }
            }
          } catch (error) {
            console.error('Error checking Bluetooth status:', error);
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
    };
  }, []);

  const scan = async () => {
    try {
      setIsScanning(true);
      setConnectionError(null);
      console.log('Starting Bluetooth scan...');

      if (isRealDevice) {
        try {
          // Check if Bluetooth is enabled
          const enabled = await RNBluetoothClassic.isBluetoothEnabled();
          if (!enabled) {
            try {
              await RNBluetoothClassic.requestBluetoothEnabled();
              console.log('Bluetooth has been enabled');
            } catch (error) {
              console.log('Please enable Bluetooth to scan for devices');
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
        }
      } else {
        // Mock implementation for web/development
        await new Promise(resolve => setTimeout(resolve, 1000));
        setDevices([
          {
            id: '00:11:22:33:44:55',
            name: 'ESP32 Energy Monitor',
            address: '00:11:22:33:44:55',
          },
          {
            id: 'AA:BB:CC:DD:EE:FF',
            name: 'BT Device',
            address: 'AA:BB:CC:DD:EE:FF',
          },
        ]);
      }
    } catch (error) {
      console.error('Error scanning for devices:', error);
      setConnectionError('Failed to scan for devices');
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
        try {
          // Check if Bluetooth is enabled
          const enabled = await RNBluetoothClassic.isBluetoothEnabled();
          if (!enabled) {
            try {
              await RNBluetoothClassic.requestBluetoothEnabled();
            } catch (error) {
              console.log('Please enable Bluetooth to scan for devices');
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
          setIsScanning(false);
        }
      } else {
        // Mock implementation for web/development
        await new Promise(resolve => setTimeout(resolve, 2000));
        setUnpairedDevices([
          {
            id: '11:22:33:44:55:66',
            name: 'New Device',
            address: '11:22:33:44:55:66',
          },
        ]);
        setIsScanning(false);
      }
    } catch (error) {
      console.error('Error discovering unpaired devices:', error);
      setConnectionError('Failed to discover unpaired devices');
      setIsScanning(false);
    }
  };

  const pairDevice = async (deviceId: string) => {
    try {
      setConnectionError(null);
      console.log('Attempting to pair with device:', deviceId);

      if (isRealDevice) {
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
        }
      } else {
        // Mock implementation for web/development
        await new Promise(resolve => setTimeout(resolve, 1500));
        const device = unpairedDevices.find(d => d.id === deviceId);
        if (device) {
          setDevices(prev => [...prev, device]);
          setUnpairedDevices(prev => prev.filter(d => d.id !== deviceId));
        }
      }
    } catch (error) {
      console.error('Error pairing device:', error);
      setConnectionError('Failed to pair with device');
    }
  };

  const connect = async (deviceId: string) => {
    try {
      setConnectionError(null);
      console.log('Connecting to device:', deviceId);

      // Find the device in the list
      const device = devices.find(d => d.id === deviceId);
      if (!device) {
        throw new Error('Device not found');
      }

      if (isRealDevice) {
        try {
          // Connect to the device
          console.log('Attempting to connect to real device...');
          const btDevice = await RNBluetoothClassic.connectToDevice(deviceId);
          console.log('Connected to device');

          connectedDeviceRef.current = btDevice;

          // Store the device ID for reconnection
          lastConnectedDeviceIdRef.current = deviceId;

          // Setup data listener
          setupDataListener(btDevice);

          setIsConnected(true);
          setConnectedDevice(device);

          // Clear any previous received data
          setReceivedData('');
          setLastUpdated(new Date());

          console.log(`Connected to ${device.name || device.address}`);

          // Send STATUS command to get initial state
          await sendCommand('STATUS');
        } catch (error) {
          console.error('Error in real device connection:', error);
          setConnectionError(
            'Failed to connect: ' +
              (error instanceof Error ? error.message : String(error)),
          );
        }
      } else {
        // Mock implementation for web/development
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsConnected(true);
        setConnectedDevice(device);
        setReceivedData('');
        setLastUpdated(new Date());

        // Simulate receiving initial status data
        setTimeout(() => {
          const mockData = `
Socket 1: ON, 120.5W, 0.25 kWh, ₦52.50
Socket 2: OFF, 0.0W, 0.75 kWh, ₦157.50
Socket 1 V:220.5V I:0.55A
Socket 2 V:0.0V I:0.0A
Light level: 350
Light threshold: 500
Light relay: OFF
Auto mode: ON
`;
          setReceivedData(mockData);
          setLastUpdated(new Date());
        }, 500);
      }
    } catch (error) {
      console.error('Error connecting to device:', error);
      setConnectionError(
        `Failed to connect: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  };

  const reconnect = async () => {
    const deviceId = lastConnectedDeviceIdRef.current;
    if (!deviceId) {
      setConnectionError('No previous connection to reconnect to');
      return;
    }

    try {
      console.log('Attempting to reconnect...');

      if (isRealDevice && connectedDeviceRef.current) {
        try {
          // Check if we're already connected
          const alreadyConnected =
            await connectedDeviceRef.current.isConnected();
          if (alreadyConnected) {
            setIsConnected(true);
            setConnectionError(null);
            return;
          }
        } catch (error) {
          // Error checking connection, proceed with reconnect attempt
          console.error('Error checking connection before reconnect:', error);
        }
      }

      // Try to reconnect
      await connect(deviceId);
    } catch (error) {
      console.error('Error reconnecting:', error);
      setConnectionError('Failed to reconnect');
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
        }
      } else if (!isRealDevice) {
        // Mock implementation for web/development
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setIsConnected(false);
      setConnectedDevice(null);
      connectedDeviceRef.current = null;

      console.log('Disconnected from the device');
    } catch (error) {
      console.error('Error disconnecting:', error);
      setConnectionError('Failed to disconnect');
    }
  };

  const sendCommand = async (command: string) => {
    if (!isConnected) {
      console.log('Please connect to a device first');
      return Promise.reject(new Error('Not connected'));
    }

    try {
      // Add newline to command if not present
      const formattedCommand = command.endsWith('\n')
        ? command
        : command + '\n';

      if (isRealDevice && connectedDeviceRef.current) {
        try {
          console.log('Sending command to real device:', command);
          await connectedDeviceRef.current.write(formattedCommand);
          console.log('Command sent successfully');
        } catch (error) {
          console.error('Error sending command to real device:', error);
          setConnectionError(
            'Failed to send command: ' +
              (error instanceof Error ? error.message : String(error)),
          );

          // Check if we're still connected
          try {
            const stillConnected =
              await connectedDeviceRef.current.isConnected();
            if (!stillConnected) {
              setIsConnected(false);
              setConnectionError('Connection lost while sending command');
            }
          } catch (error) {
            console.error(
              'Error checking connection after send failure:',
              error,
            );
          }

          throw error;
        }
      } else if (!isRealDevice) {
        // Mock implementation for web/development
        console.log('Sending mock command:', command);

        // Simulate receiving response data based on command
        setTimeout(() => {
          let response = '';

          if (command === 'STATUS') {
            response = `
Socket 1: ${Math.random() > 0.5 ? 'ON' : 'OFF'}, ${(
              Math.random() * 200
            ).toFixed(1)}W, ${(Math.random() * 1).toFixed(2)} kWh, ₦${(
              Math.random() * 200
            ).toFixed(2)}
Socket 2: ${Math.random() > 0.5 ? 'ON' : 'OFF'}, ${(
              Math.random() * 200
            ).toFixed(1)}W, ${(Math.random() * 1).toFixed(2)} kWh, ₦${(
              Math.random() * 200
            ).toFixed(2)}
Socket 1 V:${(220 + Math.random() * 10).toFixed(1)}V I:${(
              Math.random() * 1
            ).toFixed(2)}A
Socket 2 V:${(220 + Math.random() * 10).toFixed(1)}V I:${(
              Math.random() * 1
            ).toFixed(2)}A
Light level: ${Math.floor(Math.random() * 1000)}
Light threshold: 500
Light relay: ${Math.random() > 0.5 ? 'ON' : 'OFF'}
Auto mode: ON
`;
          } else if (command.startsWith('R1')) {
            response = `Socket 1: ${command.includes('ON') ? 'ON' : 'OFF'}`;
          } else if (command.startsWith('R2')) {
            response = `Socket 2: ${command.includes('ON') ? 'ON' : 'OFF'}`;
          } else if (command.startsWith('L')) {
            response = `Light relay: ${command.includes('ON') ? 'ON' : 'OFF'}`;
          } else if (command.startsWith('AUTO')) {
            response = `Auto mode: ${command.includes('ON') ? 'ON' : 'OFF'}`;
          } else if (command.startsWith('SET THRESHOLD')) {
            const threshold = command.split(' ')[2];
            response = `Light threshold set to ${threshold}`;
          } else if (command === 'ENERGY RESET') {
            response = 'Energy counters reset';
          }

          setReceivedData(prev => prev + response + '\n');
          setLastUpdated(new Date());
        }, 300);
      }

      // Update last updated timestamp
      setLastUpdated(new Date());
      return Promise.resolve();
    } catch (error) {
      console.error('Error sending command:', error);
      return Promise.reject(error);
    }
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
      }}>
      {children}
    </BluetoothContext.Provider>
  );
}

export function useBluetooth() {
  return useContext(BluetoothContext);
}
