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
import { useUser } from "@/contexts/AuthContext";
import { fetchOwnerLedger } from "@/api/client";
import { DuesRow } from "@/components/DuesRow";
import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import type { DueEntry, OwnerLedger } from "@/types";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "DZD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function mapEntry(raw: Record<string, unknown>): DueEntry {
  return {
    id: String(raw.id ?? raw.period ?? Math.random()),
    period: String(raw.period ?? ""),
    dueAmount: Number(raw.dueAmount ?? raw.amount ?? 0),
    paidAmount: Number(raw.paidAmount ?? 0),
    remainingAmount: Number(raw.remainingAmount ?? raw.remaining ?? 0),
    status: (raw.status ?? "UNPAID") as DueEntry["status"],
  };
}

export default function CotisationsScreen() {
  const user = useUser();
  const [ledger, setLedger] = useState<OwnerLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user.ownerId) {
      setError("Aucun profil copropietaire associe a votre compte.");
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const raw = await fetchOwnerLedger(user.ownerId) as Record<string, unknown>;
      setLedger({
        remainingDueNowTotal: Number(raw.remainingDueNowTotal ?? 0),
        remainingFutureTotal: Number(raw.remainingFutureTotal ?? 0),
        dueNow: (Array.isArray(raw.dueNow) ? raw.dueNow : []).map(mapEntry),
        future: (Array.isArray(raw.future) ? raw.future : []).map(mapEntry),
        payments: Array.isArray(raw.payments)
          ? (raw.payments as Record<string, unknown>[]).map((p) => ({
              id: String(p.id ?? ""),
              date: String(p.date ?? p.createdAt ?? ""),
              amount: Number(p.amount ?? 0),
              reference: String(p.reference ?? p.receiptRef ?? ""),
            }))
          : [],
      });
    } catch {
      setError("Impossible de charger vos cotisations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.ownerId]);

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
        {/* Title */}
        <Text style={styles.pageTitle}>Mes Cotisations</Text>
        {user.unitRef ? (
          <Text style={styles.unitLabel}>Lot {user.unitRef}</Text>
        ) : null}

        {loading && !ledger ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : ledger ? (
          <>
            {/* Summary cards */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { borderLeftColor: Colors.danger }]}>
                <Text style={styles.summaryLabel}>Du maintenant</Text>
                <Text style={[styles.summaryAmount, { color: Colors.danger }]}>
                  {fmt(ledger.remainingDueNowTotal)}
                </Text>
              </View>
              <View style={[styles.summaryCard, { borderLeftColor: Colors.warning }]}>
                <Text style={styles.summaryLabel}>Echeances futures</Text>
                <Text style={[styles.summaryAmount, { color: Colors.warning }]}>
                  {fmt(ledger.remainingFutureTotal)}
                </Text>
              </View>
            </View>

            {/* Due now */}
            {ledger.dueNow.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                  <Text style={[styles.sectionTitle, { color: Colors.danger }]}>
                    Charges a payer ({ledger.dueNow.length})
                  </Text>
                </View>
                {ledger.dueNow.map((entry) => (
                  <DuesRow key={entry.id} entry={entry} />
                ))}
              </>
            ) : (
              <View style={styles.allPaidBox}>
                <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
                <Text style={styles.allPaidText}>Vous etes a jour !</Text>
              </View>
            )}

            {/* Future */}
            {ledger.future.length > 0 ? (
              <>
                <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                  <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.sectionTitle}>
                    A venir ({ledger.future.length})
                  </Text>
                </View>
                {ledger.future.map((entry) => (
                  <DuesRow key={entry.id} entry={entry} />
                ))}
              </>
            ) : null}

            {/* Payment history */}
            {ledger.payments.length > 0 ? (
              <>
                <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                  <Ionicons name="receipt-outline" size={16} color={Colors.primary} />
                  <Text style={[styles.sectionTitle, { color: Colors.primary }]}>
                    Historique ({ledger.payments.length})
                  </Text>
                </View>
                {ledger.payments.map((p) => (
                  <View key={p.id} style={styles.paymentRow}>
                    <View>
                      <Text style={styles.paymentDate}>
                        {new Date(p.date).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </Text>
                      {p.reference ? (
                        <Text style={styles.paymentRef}>Ref: {p.reference}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.paymentAmount}>{fmt(p.amount)}</Text>
                  </View>
                ))}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 2,
  },
  unitLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 17,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  allPaidBox: {
    backgroundColor: Colors.successLight,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  allPaidText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.successText,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  paymentDate: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
  },
  paymentRef: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.successText,
  },
  center: { paddingTop: 60, alignItems: "center" },
  errorBox: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  errorText: { color: Colors.dangerText, fontSize: 14 },
});
