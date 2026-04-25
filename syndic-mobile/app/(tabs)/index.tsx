import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useUser } from "@/contexts/AuthContext";
import { fetchDashboard } from "@/api/client";
import { KPICard } from "@/components/KPICard";
import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "DZD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number) {
  return `${Math.round(n)}%`;
}

type DashData = {
  totalReceipts?: number;
  totalPayments?: number;
  cashBalance?: number;
  bankBalance?: number;
  collectionRate?: number;
  ownersCount?: number;
  paidOwnersCount?: number;
};

export default function DashboardScreen() {
  const user = useUser();
  const { signOut } = useAuth();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const year = new Date().getFullYear();

  const load = useCallback(async () => {
    try {
      setError(null);
      const raw = await fetchDashboard(year);
      setData(raw as DashData);
    } catch {
      setError("Impossible de charger le tableau de bord.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year]);

  useEffect(() => { void load(); }, [load]);

  function onRefresh() {
    setRefreshing(true);
    void load();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.username}>
              {user.name?.split(" ")[0] ?? user.email}
            </Text>
          </View>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>
              {(user.name ?? user.email).charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Year badge */}
        <View style={styles.yearBadge}>
          <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
          <Text style={styles.yearText}>Exercice {year}</Text>
        </View>

        {loading && !data ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : data ? (
          <>
            <Text style={styles.sectionTitle}>Finances</Text>

            <KPICard
              label="Taux de recouvrement"
              value={fmtPct(data.collectionRate ?? 0)}
              sub="Cotisations encaissees vs dues"
              color={
                (data.collectionRate ?? 0) >= 80
                  ? Colors.success
                  : (data.collectionRate ?? 0) >= 50
                  ? Colors.warning
                  : Colors.danger
              }
              icon={<Ionicons name="trending-up-outline" size={18} color={Colors.primary} />}
            />

            <KPICard
              label="Solde tresorerie"
              value={fmt(data.cashBalance ?? 0)}
              sub={`Banque: ${fmt(data.bankBalance ?? 0)}`}
              color={Colors.primary}
              icon={<Ionicons name="wallet-outline" size={18} color={Colors.primary} />}
            />

            <KPICard
              label="Encaissements"
              value={fmt(data.totalReceipts ?? 0)}
              sub={`Depenses: ${fmt(data.totalPayments ?? 0)}`}
              color={Colors.info}
              icon={<Ionicons name="arrow-down-circle-outline" size={18} color={Colors.info} />}
            />

            <Text style={styles.sectionTitle}>Copropietaires</Text>

            <KPICard
              label="Copropietaires a jour"
              value={`${data.paidOwnersCount ?? 0} / ${data.ownersCount ?? 0}`}
              sub={
                (data.ownersCount ?? 0) > 0
                  ? `${Math.round(((data.paidOwnersCount ?? 0) / (data.ownersCount ?? 1)) * 100)}% ont paye`
                  : ""
              }
              color={Colors.success}
              icon={<Ionicons name="people-outline" size={18} color={Colors.success} />}
            />
          </>
        ) : null}

        {/* Logout */}
        <View style={styles.logoutRow}>
          <Text
            style={styles.logoutLink}
            onPress={() => void signOut()}
          >
            Se deconnecter
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greeting: { fontSize: 13, color: Colors.textSecondary },
  username: { fontSize: 22, fontWeight: "700", color: Colors.text },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  yearBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primaryLight,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 20,
  },
  yearText: { fontSize: 12, fontWeight: "600", color: Colors.primary },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  center: { paddingTop: 60, alignItems: "center" },
  errorBox: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  errorText: { color: Colors.dangerText, fontSize: 14 },
  logoutRow: { marginTop: 32, alignItems: "center" },
  logoutLink: { color: Colors.danger, fontSize: 14, fontWeight: "600" },
});
