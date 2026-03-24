import {
  MeetingDocumentType,
  MeetingResolutionStatus,
  MeetingStatus,
  MeetingType,
  MeetingVoteRule,
} from "@prisma/client";

export const meetingTypeOptions = [
  { value: MeetingType.ORDINARY, label: "Ordinaire" },
  { value: MeetingType.EXTRAORDINARY, label: "Extraordinaire" },
] as const;

export const meetingStatusLabels: Record<MeetingStatus, string> = {
  SCHEDULED: "Planifiee",
  CONVOCATIONS_SENT: "Convocations envoyees",
  MINUTES_READY: "Proces-verbal pret",
  COMPLETED: "Cloturee",
};

export const meetingResolutionStatusLabels: Record<MeetingResolutionStatus, string> = {
  PENDING: "En attente",
  ADOPTED: "Adoptee",
  REJECTED: "Rejetee",
};

export const meetingVoteRuleLabels: Record<MeetingVoteRule, string> = {
  SIMPLE: "Majorite simple (Article 24)",
  ABSOLUTE: "Majorite absolue (Article 25)",
  DOUBLE: "Double majorite (Article 26)",
  UNANIMOUS: "Unanimite",
};

export const standardMeetingDocumentLabels: Record<MeetingDocumentType, string> = {
  ATTENDANCE_SHEET: "Feuille de presence",
  MINUTES: "Proces-verbal",
  OTHER: "Autre document",
};

export function getMeetingStatusTone(status: MeetingStatus) {
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "MINUTES_READY") return "bg-cyan-50 text-cyan-700 border-cyan-200";
  if (status === "CONVOCATIONS_SENT") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

export function getResolutionStatusTone(status: MeetingResolutionStatus) {
  if (status === "ADOPTED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "REJECTED") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export function asMeetingType(value: unknown) {
  return value === MeetingType.EXTRAORDINARY ? MeetingType.EXTRAORDINARY : MeetingType.ORDINARY;
}

export function asMeetingVoteRule(value: unknown) {
  return Object.values(MeetingVoteRule).includes(value as MeetingVoteRule)
    ? (value as MeetingVoteRule)
    : MeetingVoteRule.SIMPLE;
}

