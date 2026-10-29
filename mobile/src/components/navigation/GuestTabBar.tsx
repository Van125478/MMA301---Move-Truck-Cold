import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { TabBar, type TabItem } from "./TabBar";

export type GuestTabId = "explore" | "login" | "register";

const guestTabs: TabItem[] = [
  { id: "explore", label: "Khám phá", icon: "compass-outline" },
  { id: "login", label: "Đăng nhập", icon: "login" },
  { id: "register", label: "Đăng ký", icon: "account-plus-outline" },
];

export function GuestTabBar({ active }: { active: GuestTabId }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  function go(id: string) {
    if (id === active) return;
    if (id === "explore") navigation.navigate("Landing");
    else if (id === "login") navigation.navigate("Login");
    else if (id === "register") navigation.navigate("Register");
  }

  return <TabBar items={guestTabs} active={active} onChange={go} />;
}
