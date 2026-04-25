import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "@/constants/colors";
import { StatusBadge } from "@/components/StatusBadge";
import type { Claim } from "@/types";

type Props = {
  claim: Claim;
  onPress?: () => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  WATER: "Eau",
  ELECTRICITY: "Electricite",
  ELEVATOR: "Ascenseur",
  COMMON_AREAS: "Parties communes",
  HEATING: "Chauffage",
  OTHER: "Autre",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ClaimCard({ claim, onPress }: Props) {
  const unitLabel =
    claim.unit?.reference ?? claim.unit?.lotNumber ?? null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.header}>
        <View style={styles.badges}>
          <StatusBadge type="claim" value={claim.status} />
          <View style={{ width: 6 }} />
          <StatusBadge type="priority" value={claim.priority} />
        </View>
        <Text style={styles.date}>{formatDate(claim.createdAt)}</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>{claim.title}</Text>

      <View style={styles.footer}>
        <Text style={styles.meta}>
          {CATEGORY_LABELS[claim.category] ?? claim.category}
          {unitLabel ? `  •  Lot ${unitLabel}` : ""}
        </Text>
        {(claim.comments?.length ?? 0) > 0 ? (
          <Text style={styles.comments}>
            {claim.comments!.length} commentaire{claim.comments!.length > 1 ? "s" : ""}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badges: {
    flexDirection: "row",
    alignItems: "center",
  },
  date: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  comments: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "500",
  },
});
