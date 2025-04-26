import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

interface CustomNavBarProps {
  activeScreen: string;
  onScreenChange: (screen: string) => void;
}

export function CustomNavBar({
  activeScreen,
  onScreenChange,
}: CustomNavBarProps) {
  return (
    <View style={styles.navBar}>
      <TouchableOpacity
        style={[
          styles.navItem,
          activeScreen === 'Dashboard' && styles.activeNavItem,
        ]}
        onPress={() => onScreenChange('Dashboard')}>
        <Icon
          name="layout"
          size={22}
          color={activeScreen === 'Dashboard' ? '#0070f3' : '#6b7280'}
        />
        <Text
          style={[
            styles.navText,
            activeScreen === 'Dashboard' && styles.activeNavText,
          ]}>
          Dashboard
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.navItem,
          activeScreen === 'Control' && styles.activeNavItem,
        ]}
        onPress={() => onScreenChange('Control')}>
        <Icon
          name="power"
          size={22}
          color={activeScreen === 'Control' ? '#0070f3' : '#6b7280'}
        />
        <Text
          style={[
            styles.navText,
            activeScreen === 'Control' && styles.activeNavText,
          ]}>
          Control
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.navItem,
          activeScreen === 'Settings' && styles.activeNavItem,
        ]}
        onPress={() => onScreenChange('Settings')}>
        <Icon
          name="sliders"
          size={22}
          color={activeScreen === 'Settings' ? '#0070f3' : '#6b7280'}
        />
        <Text
          style={[
            styles.navText,
            activeScreen === 'Settings' && styles.activeNavText,
          ]}>
          Settings
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.navItem,
          activeScreen === 'History' && styles.activeNavItem,
        ]}
        onPress={() => onScreenChange('History')}>
        <Icon
          name="clock"
          size={22}
          color={activeScreen === 'History' ? '#0070f3' : '#6b7280'}
        />
        <Text
          style={[
            styles.navText,
            activeScreen === 'History' && styles.activeNavText,
          ]}>
          History
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'white',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeNavItem: {
    borderTopWidth: 2,
    borderTopColor: '#0070f3',
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: '#6b7280',
  },
  activeNavText: {
    color: '#0070f3',
    fontWeight: '500',
  },
});
