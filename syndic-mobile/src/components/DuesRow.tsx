import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";
import { StatusBadge } from "@/components/StatusBadge";
import type { DueEntry } from "@/types";

function formatAmount(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "DZD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPeriod(period: string) {
  // "2024-03" → "Mars 2024"
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

type Props = { entry: DueEntry };

export function DuesRow({ entry }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.period}>{formatPeriod(entry.period)}</Text>
        <Text style={styles.amount}>{formatAmount(entry.dueAmount)}</Text>
      </View>
      <View style={styles.right}>
        <StatusBadge type="due" value={entry.status} />
        {entry.status !== "PAID" ? (
          <Text style={styles.remaining}>
            Restant: {formatAmount(entry.remainingAmount)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  left: {
    flex: 1,
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
  },
  period: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
    textTransform: "capitalize",
  },
  amount: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  remaining: {
    fontSize: 11,
    color: Colors.dangerText,
    marginTop: 4,
  },
});
