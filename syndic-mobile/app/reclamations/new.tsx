import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createClaim } from "@/api/client";
import { useUser } from "@/contexts/AuthContext";
import { Colors } from "@/constants/colors";
import type { ClaimCategory } from "@/types";

const CATEGORIES: { label: string; value: ClaimCategory; icon: string }[] = [
  { label: "Eau", value: "WATER", icon: "water-outline" },
  { label: "Electricite", value: "ELECTRICITY", icon: "flash-outline" },
  { label: "Ascenseur", value: "ELEVATOR", icon: "arrow-up-outline" },
  { label: "Parties communes", value: "COMMON_AREAS", icon: "business-outline" },
  { label: "Chauffage", value: "HEATING", icon: "flame-outline" },
  { label: "Autre", value: "OTHER", icon: "ellipsis-horizontal-outline" },
];

export default function NewClaimScreen() {
  const router = useRouter();
  const user = useUser();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ClaimCategory | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = title.trim().length >= 3 && category !== null && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    if (!user.unitId || !user.ownerId) {
      Alert.alert(
        "Profil incomplet",
        "Votre compte n'est pas associe a un lot. Contactez votre syndic."
      );
      return;
    }

    setLoading(true);
    try {
      await createClaim({
        title: title.trim(),
        description: description.trim(),
        category: category!,
        unitId: user.unitId,
        ownerId: user.ownerId,
      });
      Alert.alert(
        "Reclamation envoyee",
        "Votre reclamation a ete soumise avec succes.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch {
      Alert.alert(
        "Erreur",
        "Impossible d'envoyer la reclamation. Verifiez votre connexion et reessayez."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Nav bar */}
        <View style={styles.navBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.navTitle}>Nouvelle reclamation</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Objet *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Fuite d'eau dans le couloir..."
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              returnKeyType="next"
            />
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Categorie *</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    category === cat.value && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={20}
                    color={category === cat.value ? "#fff" : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      category === cat.value && styles.categoryTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description (facultatif)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Decrivez le probleme en detail..."
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          {/* Lot info */}
          {user.unitRef ? (
            <View style={styles.infoBox}>
              <Ionicons name="home-outline" size={16} color={Colors.primary} />
              <Text style={styles.infoText}>
                Lot: <Text style={{ fontWeight: "600" }}>{user.unitRef}</Text>
              </Text>
            </View>
          ) : null}

          {/* Submit */}
          <Pressable
            style={[styles.submitBtn, !canSubmit && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.submitText}>Envoyer la reclamation</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  field: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  textarea: {
    height: 110,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "right",
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  categoryTextActive: {
    color: "#fff",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    color: Colors.primaryDark,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitDisabled: { opacity: 0.5, shadowOpacity: 0 },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
