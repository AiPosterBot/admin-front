// ══════════════════════════════════════════════════════════════════════
//  Ads Service — единственная точка доступа к рекламным данным.
//  При переходе на backend: замените тела функций на HTTP-вызовы.
// ══════════════════════════════════════════════════════════════════════

import {
  mockAdsCampaigns,
  mockAdsPosts,
  type AdsCampaign,
  type AdsPost,
} from '../data/mock-data';

// ── Campaigns ─────────────────────────────────────────────────────────

/** Все кампании команды */
export function getTeamCampaignsList(teamId: string): AdsCampaign[] {
  return mockAdsCampaigns.filter((c) => c.teamId === teamId);
}

/** Найти кампанию по id (без проверки команды) */
export function getCampaignById(campaignId: string): AdsCampaign | undefined {
  return mockAdsCampaigns.find((c) => c.id === campaignId);
}

/** Найти кампанию по id с проверкой принадлежности команде */
export function getTeamCampaignById(
  campaignId: string,
  teamId: string,
): AdsCampaign | undefined {
  return mockAdsCampaigns.find(
    (c) => c.id === campaignId && c.teamId === teamId,
  );
}

// ── Posts ─────────────────────────────────────────────────────────────

/** Все рекламные посты команды */
export function getTeamPostsList(teamId: string): AdsPost[] {
  return mockAdsPosts.filter((p) => p.teamId === teamId);
}

/** Найти рекламный пост по id */
export function getAdsPostById(postId: string): AdsPost | undefined {
  return mockAdsPosts.find((p) => p.id === postId);
}

/** Все кампании, использующие данный пост */
export function getCampaignsByPostId(postId: string): AdsCampaign[] {
  return mockAdsCampaigns.filter((c) => c.adsPostId === postId);
}
