import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppErrorBoundary } from "./src/components/common/AppErrorBoundary";
import { AuthProvider } from "./src/features/auth/AuthProvider";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  const [fontsReady, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsReady && !fontError) return <View style={styles.boot} />;

  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: "#F8FAFC" },
});
