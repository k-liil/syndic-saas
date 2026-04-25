import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

type Props = {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
};

export function KPICard({ label, value, sub, color = Colors.primary, icon }: Props) {
  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: color }]} />
      <View style={styles.body}>
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color }]}>{value}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 12,
  },
  accent: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: 16,
  },
  iconWrap: {
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 2,
  },
  sub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
