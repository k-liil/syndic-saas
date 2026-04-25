import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { fetchClaims } from "@/api/client";
import { ClaimCard } from "@/components/ClaimCard";
import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import type { Claim, ClaimStatus } from "@/types";

const FILTERS: { label: string; value: ClaimStatus | "ALL" }[] = [
  { label: "Toutes", value: "ALL" },
  { label: "Ouvertes", value: "OPEN" },
  { label: "En cours", value: "IN_PROGRESS" },
  { label: "Closes", value: "CLOSED" },
];

export default function ReclamationsScreen() {
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ClaimStatus | "ALL">("ALL");

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchClaims();
      setClaims(data as Claim[]);
    } catch {
      setError("Impossible de charger les reclamations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function onRefresh() {
    setRefreshing(true);
    void load();
  }

  const filtered =
    filter === "ALL" ? claims : claims.filter((c) => c.status === filter);

  const openCount = claims.filter((c) => c.status === "OPEN").length;
  const inProgressCount = claims.filter((c) => c.status === "IN_PROGRESS").length;

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
            <Text style={styles.pageTitle}>Reclamations</Text>
            {!loading && claims.length > 0 ? (
              <Text style={styles.subtitle}>
                {openCount} ouverte{openCount !== 1 ? "s" : ""}
                {inProgressCount > 0
                  ? `, ${inProgressCount} en cours`
                  : ""}
              </Text>
            ) : null}
          </View>
          <Pressable
            style={styles.fab}
            onPress={() => router.push("/reclamations/new")}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((f) => (
            <Pressable
              key={f.value}
              style={[
                styles.filterChip,
                filter === f.value && styles.filterChipActive,
              ]}
              onPress={() => setFilter(f.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === f.value && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading && claims.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="chatbubble-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Aucune reclamation</Text>
            <Text style={styles.emptyText}>
              {filter === "ALL"
                ? "Appuyez sur + pour soumettre votre premiere reclamation."
                : "Aucune reclamation dans cette categorie."}
            </Text>
          </View>
        ) : (
          filtered.map((claim) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              onPress={() =>
                router.push({
                  pathname: "/reclamations/[id]",
                  params: { id: claim.id },
                })
              }
            />
          ))
        )}
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
    alignItems: "flex-start",
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fab: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    paddingRight: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: "#fff",
  },
  center: { paddingTop: 60, alignItems: "center" },
  errorBox: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    padding: 16,
  },
  errorText: { color: Colors.dangerText, fontSize: 14 },
  emptyBox: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
