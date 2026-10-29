import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { useTheme } from "../constants/theme";
import { useAuth } from "../features/auth/AuthProvider";
import { ChangePasswordScreen } from "../screens/auth/ChangePasswordScreen";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { ResetPasswordScreen } from "../screens/auth/ResetPasswordScreen";
import { GuestSavedScreen } from "../screens/guest/GuestSavedScreen";
import { LandingScreen } from "../screens/guest/LandingScreen";
import { NotificationsScreen } from "../screens/notifications/NotificationsScreen";
import { ChatInboxScreen } from "../screens/chat/ChatInboxScreen";
import { SessionGate } from "../screens/SessionGate";
import { ShipmentDetailScreen } from "../screens/shipments/ShipmentDetailScreen";
import { WorkspaceScreen } from "../screens/workspace/WorkspaceScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

function linkingFor(signedIn: boolean, mustChange: boolean) {
  return {
    prefixes: ["coldi://"],
    // Expo Go mở bằng exp://... Trên điện thoại, địa chỉ đó không được chọn màn đăng nhập.
    ...(Platform.OS === "web" ? {} : { getInitialURL: () => null }),
    config: {
      initialRouteName: (signedIn ? (mustChange ? "ChangePassword" : "Workspace") : "Landing") as
        | "Landing"
        | "ChangePassword"
        | "Workspace",
      screens: signedIn
        ? mustChange
          ? { ChangePassword: "doi-mat-khau" }
          : { Workspace: "trang-chu", ShipmentDetail: "don/:id", Notifications: "thong-bao", ChatInbox: "hop-thu" }
        : {
            Landing: "",
            GuestSaved: "yeu-thich",
            Login: "dang-nhap",
            Register: "dang-ky",
            ForgotPassword: "quen-mat-khau",
            ResetPassword: "dat-lai-mat-khau",
            Notifications: "thong-bao",
          },
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
      <Stack.Navigator
        initialRouteName={signedIn ? (mustChange ? "ChangePassword" : "Workspace") : "Landing"}
        screenOptions={{
          headerShown: false,
          animation: Platform.OS === "web" ? "fade" : "slide_from_right",
          animationDuration: 280,
          freezeOnBlur: true,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!signedIn ? (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="GuestSaved" component={GuestSavedScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        ) : mustChange ? (
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        ) : (
          <>
            <Stack.Screen name="Workspace" component={WorkspaceScreen} />
            <Stack.Screen name="ShipmentDetail" component={ShipmentDetailScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="ChatInbox" component={ChatInboxScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
