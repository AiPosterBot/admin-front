import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api";

export interface ProfileRecord {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  telegramUsername: string | null;
  telegramLinkedAt: string | null;
}

export interface TelegramLinkStartResult {
  deepLink: string;
  qrUrl: string;
}

export interface TelegramLinkStatusResult {
  linked: boolean;
  pending: boolean;
  profile: ProfileRecord;
}

export async function getProfile() {
  const response = await apiGet<{ profile: ProfileRecord }>("/api/profile");
  return response.profile;
}

export async function updateProfile(input: { displayName?: string; timezone?: string }) {
  const response = await apiPatch<{ profile: ProfileRecord }>("/api/profile", input);
  return response.profile;
}

export async function startTelegramLink() {
  return apiPost<TelegramLinkStartResult>("/api/profile/telegram-link/start");
}

export async function checkTelegramLink() {
  return apiPost<TelegramLinkStatusResult>("/api/profile/telegram-link/check");
}

export async function unlinkTelegram() {
  const response = await apiDelete<{ profile: ProfileRecord }>("/api/profile/telegram-link");
  return response.profile;
}
