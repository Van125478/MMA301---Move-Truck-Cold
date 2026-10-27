import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../constants/theme";
import { useAuth } from "../features/auth/AuthProvider";
import { ChangePasswordScreen } from "../screens/auth/ChangePasswordScreen";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { ResetPasswordScreen } from "../screens/auth/ResetPasswordScreen";
import { RoleHomeScreen } from "../screens/home/RoleHomeScreen";
import { ShipmentListScreen } from "../screens/shipments/ShipmentListScreen";
import { SessionGate } from "../screens/SessionGate";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

function linkingFor(signedIn: boolean, mustChange: boolean) {
  return {
    prefixes: ["coldi://"],
    config: {
      screens: signedIn
        ? mustChange
          ? { ChangePassword: "doi-mat-khau" }
          : { Home: "trang-chu" }
        : { Login: "dang-nhap", Register: "dang-ky", ForgotPassword: "quen-mat-khau", ResetPassword: "dat-lai-mat-khau" },
    },
  };
}

export function RootNavigator() {
  const { colors, scheme } = useTheme();
  const { session } = useAuth();
  if (session.status === "loading" || session.status === "offline") return <SessionGate />;

  const signedIn = session.status === "authenticated";
  const mustChange = signedIn && session.user.mustChangePassword;
  const navigationTheme = {
    ...DefaultTheme,
    dark: scheme === "dark",
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.ink,
      border: colors.line,
      primary: colors.primary,
      notification: colors.danger,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme} linking={linkingFor(signedIn, mustChange)}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        {!signedIn ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        ) : mustChange ? (
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={RoleHomeScreen} />
            <Stack.Screen name="ShipmentList" component={ShipmentListScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
