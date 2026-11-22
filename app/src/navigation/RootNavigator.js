// Alur navigasi ditentukan oleh status login:
//   belum login            -> Masuk / Daftar
//   login, belum pilih minat -> Pilih Minat
//   login                  -> Tab (Beranda, Nobar, Sumbang, Profil) + Detail Kelas + Ubah Minat
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import StateView from '../components/StateView';
import { useAuth } from '../context/AuthContext';
import ClassDetailScreen from '../screens/ClassDetailScreen';
import HomeScreen from '../screens/HomeScreen';
import InterestsScreen from '../screens/InterestsScreen';
import LoginScreen from '../screens/LoginScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { colors, fonts } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.white, primary: colors.primary } };

const TABS = [
  { name: 'Beranda', icon: 'home', component: HomeScreen },
  {
    name: 'Nobar',
    icon: 'tv',
    component: PlaceholderScreen,
    params: { icon: 'tv', title: 'Nobar', description: 'Buat ruang nobar atau gabung dengan kode, lalu nonton video yang sama dan tersinkron bersama teman.' },
  },
  {
    name: 'Sumbang',
    icon: 'plus-circle',
    component: PlaceholderScreen,
    params: { icon: 'plus-circle', title: 'Sumbang Video', description: 'Usulkan video YouTube yang bagus untuk dijadikan kelas mini. Kurator akan meninjaunya.' },
  },
  { name: 'Profil', icon: 'user', component: ProfileScreen },
];

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
        tabBarStyle: { borderTopColor: colors.line },
      }}
    >
      {TABS.map((t) => (
        <Tab.Screen
          key={t.name}
          name={t.name}
          component={t.component}
          initialParams={t.params}
          options={{ tabBarIcon: ({ color, size }) => <Feather name={t.icon} size={size} color={color} /> }}
        />
      ))}
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { status, user, error, retry } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <StateView kind="loading" message="Membuka NobarIlmu…" />
      </View>
    );
  }
  if (status === 'error') {
    return (
      <View style={styles.center}>
        <StateView kind="error" message={error} onRetry={retry} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {status === 'signedOut' ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : user.needsOnboarding ? (
          <Stack.Screen name="Interests" component={InterestsScreen} initialParams={{ onboarding: true }} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen name="ClassDetail" component={ClassDetailScreen} />
            <Stack.Screen name="Interests" component={InterestsScreen} initialParams={{ onboarding: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
});
