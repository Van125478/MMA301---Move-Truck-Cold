import { useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { useFavorites } from "../../features/favorites/FavoritesProvider";
import { TabBar, type TabItem } from "./TabBar";

export type GuestTabId = "explore" | "saved" | "login" | "register";

const guestTabs: TabItem[] = [
  { id: "explore", label: "Khám phá", icon: "compass-outline" },
  { id: "saved", label: "Yêu thích", icon: "heart-outline" },
  { id: "login", label: "Đăng nhập", icon: "login" },
  { id: "register", label: "Đăng ký", icon: "account-plus-outline" },
];

export function GuestTabBar({ active }: { active: GuestTabId }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const favorites = useFavorites();
  const savedCount = favorites.ready ? favorites.items.length : 0;
  const tabs = useMemo(
    () => guestTabs.map((item) => (item.id === "saved" ? { ...item, badgeCount: savedCount } : item)),
    [savedCount],
  );

  function go(id: string) {
    if (id === active) return;
    if (id === "explore") navigation.navigate("Landing");
    else if (id === "saved") navigation.navigate("GuestSaved");
    else if (id === "login") navigation.navigate("Login");
    else if (id === "register") navigation.navigate("Register");
  }

  return <TabBar items={tabs} active={active} onChange={go} />;
}
