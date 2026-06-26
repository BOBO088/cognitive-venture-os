/**
 * GEO 仓储：GEOBrandEntity / GEOContentAsset / AIQuery / CitationCheckResult 查询入口。
 */

import {
  mockGEOBrands,
  mockGEOContentAssets,
  mockAIQueries,
  mockCitationCheckResults,
  mockBrandEntityProfiles,
  mockAIQueryBankItems,
  mockContentAssets,
  mockGEOAudits,
  mockAICitationChecks,
} from '@/mock-data/geo';
import type {
  GEOBrandEntity,
  GEOContentAsset,
  AIQuery,
  CitationCheckResult,
  BrandEntityProfile,
  BrandEntityCategory,
  AIQueryBankItem,
  ContentAsset,
  GEOAudit,
  AICitationCheck,
} from '@/types';

export async function listBrands(): Promise<GEOBrandEntity[]> {
  return mockGEOBrands;
}

export async function getBrand(id: string): Promise<GEOBrandEntity | undefined> {
  return mockGEOBrands.find((b) => b.id === id);
}

export async function listContentAssets(): Promise<GEOContentAsset[]> {
  return mockGEOContentAssets;
}

export async function listContentAssetsByBrand(brandId: string): Promise<GEOContentAsset[]> {
  return mockGEOContentAssets.filter((a) => a.brandId === brandId);
}

export async function listAIQueries(): Promise<AIQuery[]> {
  return mockAIQueries;
}

export async function listAIQueriesByBrand(brandId: string): Promise<AIQuery[]> {
  return mockAIQueries.filter((q) => q.brandId === brandId);
}

export async function listCitationChecks(): Promise<CitationCheckResult[]> {
  return mockCitationCheckResults;
}

/** 按时间升序，便于画引用率时间线。 */
export async function listCitationChecksByQuery(queryId: string): Promise<CitationCheckResult[]> {
  return mockCitationCheckResults
    .filter((c) => c.queryId === queryId)
    .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
}


/* ============================================================
 * BrandEntityProfile
 *
 * 写入（insert / update / delete）由 service 层管理（验证 + 长度 +
 * 引用一致性）。
 * ============================================================ */

export async function listBrandEntityProfiles(): Promise<BrandEntityProfile[]> {
  return mockBrandEntityProfiles;
}

export async function listBrandEntityProfilesSorted(): Promise<BrandEntityProfile[]> {
  return [...mockBrandEntityProfiles].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function listBrandEntityProfilesByCategory(
  category: BrandEntityCategory,
): Promise<BrandEntityProfile[]> {
  return mockBrandEntityProfiles
    .filter((p) => p.category === category)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getBrandEntityProfile(
  id: string,
): Promise<BrandEntityProfile | undefined> {
  return mockBrandEntityProfiles.find((p) => p.id === id);
}

export async function insertBrandEntityProfile(
  profile: BrandEntityProfile,
): Promise<BrandEntityProfile> {
  mockBrandEntityProfiles.push(profile);
  return profile;
}

export async function updateBrandEntityProfileInStore(
  id: string,
  patch: Partial<BrandEntityProfile>,
): Promise<BrandEntityProfile | undefined> {
  const i = mockBrandEntityProfiles.findIndex((p) => p.id === id);
  if (i < 0) return undefined;
  const next: BrandEntityProfile = {
    ...mockBrandEntityProfiles[i]!,
    ...patch,
    id: mockBrandEntityProfiles[i]!.id,
  };
  mockBrandEntityProfiles[i] = next;
  return next;
}

export async function deleteBrandEntityProfileFromStore(
  id: string,
): Promise<boolean> {
  const i = mockBrandEntityProfiles.findIndex((p) => p.id === id);
  if (i < 0) return false;
  mockBrandEntityProfiles.splice(i, 1);
  return true;
}

/* ============================================================
 * AIQueryBankItem
 *
 * 写入（insert / update / delete）由 service 层管理（验证 +
 * brandEntityId 引用一致性 + linkedAssetIds 引用一致性）。
 * ============================================================ */

export async function listAIQueryBankItems(): Promise<AIQueryBankItem[]> {
  return mockAIQueryBankItems;
}

export async function listAIQueryBankItemsSorted(): Promise<AIQueryBankItem[]> {
  return [...mockAIQueryBankItems].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function listAIQueryBankItemsByBrand(
  brandEntityId: string,
): Promise<AIQueryBankItem[]> {
  return mockAIQueryBankItems
    .filter((q) => q.brandEntityId === brandEntityId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getAIQueryBankItem(
  id: string,
): Promise<AIQueryBankItem | undefined> {
  return mockAIQueryBankItems.find((q) => q.id === id);
}

export async function insertAIQueryBankItem(
  item: AIQueryBankItem,
): Promise<AIQueryBankItem> {
  mockAIQueryBankItems.push(item);
  return item;
}

export async function updateAIQueryBankItemInStore(
  id: string,
  patch: Partial<AIQueryBankItem>,
): Promise<AIQueryBankItem | undefined> {
  const i = mockAIQueryBankItems.findIndex((q) => q.id === id);
  if (i < 0) return undefined;
  const next: AIQueryBankItem = {
    ...mockAIQueryBankItems[i]!,
    ...patch,
    id: mockAIQueryBankItems[i]!.id,
  };
  mockAIQueryBankItems[i] = next;
  return next;
}

export async function deleteAIQueryBankItemFromStore(
  id: string,
): Promise<boolean> {
  const i = mockAIQueryBankItems.findIndex((q) => q.id === id);
  if (i < 0) return false;
  mockAIQueryBankItems.splice(i, 1);
  return true;
}


/* ============================================================
 * ContentAsset (v2 — Content Asset Library)
 *
 * 与 v0.1 的 `mockGEOContentAssets` 并行存在，函数名带 `ContentLibrary`
 * 前缀以避免与 listContentAssets (v0.1) 冲突。
 * 写入（insert / update / delete）由 service 层管理（验证 + 长度 +
 * brandEntityId 引用一致性 + targetQueryIds 引用一致性）。
 * ============================================================ */

export async function listContentLibraryAssets(): Promise<ContentAsset[]> {
  return mockContentAssets;
}

export async function listContentLibraryAssetsSorted(): Promise<
  ContentAsset[]
> {
  return [...mockContentAssets].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function listContentLibraryAssetsByBrand(
  brandEntityId: string,
): Promise<ContentAsset[]> {
  return mockContentAssets
    .filter((a) => a.brandEntityId === brandEntityId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getContentLibraryAsset(
  id: string,
): Promise<ContentAsset | undefined> {
  return mockContentAssets.find((a) => a.id === id);
}

export async function insertContentLibraryAsset(
  asset: ContentAsset,
): Promise<ContentAsset> {
  mockContentAssets.push(asset);
  return asset;
}

export async function updateContentLibraryAssetInStore(
  id: string,
  patch: Partial<ContentAsset>,
): Promise<ContentAsset | undefined> {
  const i = mockContentAssets.findIndex((a) => a.id === id);
  if (i < 0) return undefined;
  const next: ContentAsset = {
    ...mockContentAssets[i]!,
    ...patch,
    id: mockContentAssets[i]!.id,
  };
  mockContentAssets[i] = next;
  return next;
}

export async function deleteContentLibraryAssetFromStore(
  id: string,
): Promise<boolean> {
  const i = mockContentAssets.findIndex((a) => a.id === id);
  if (i < 0) return false;
  mockContentAssets.splice(i, 1);
  return true;
}


/* ============================================================
 * GEOAudit — 一次 ContentAsset 的 GEO 审计记录（append-only）。
 *
 * 写入（insert）由 service 层管理（验证 + assetId 引用一致性）。
 * 不做 update / delete —— audit 是历史快照。
 * ============================================================ */

export async function listGEOAudits(): Promise<GEOAudit[]> {
  return mockGEOAudits;
}

export async function listGEOAuditsSorted(): Promise<GEOAudit[]> {
  return [...mockGEOAudits].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function listGEOAuditsByAsset(
  assetId: string,
): Promise<GEOAudit[]> {
  return mockGEOAudits
    .filter((a) => a.assetId === assetId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getGEOAudit(
  id: string,
): Promise<GEOAudit | undefined> {
  return mockGEOAudits.find((a) => a.id === id);
}

export async function insertGEOAudit(audit: GEOAudit): Promise<GEOAudit> {
  mockGEOAudits.push(audit);
  return audit;
}


/* ============================================================
 * AICitationCheck (v2 — Citation Monitor)
 *
 * 写入（insert）由 service 层管理（验证 + queryId 引用一致性）。
 * 不做 update / delete —— check 是历史快照。
 * ============================================================ */

export async function listAICitationChecks(): Promise<AICitationCheck[]> {
  return mockAICitationChecks;
}

export async function listAICitationChecksSorted(): Promise<AICitationCheck[]> {
  return [...mockAICitationChecks].sort((a, b) =>
    b.checkedAt.localeCompare(a.checkedAt),
  );
}

export async function listAICitationChecksByQuery(
  queryId: string,
): Promise<AICitationCheck[]> {
  return mockAICitationChecks
    .filter((c) => c.queryId === queryId)
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
}

export async function listAICitationChecksByPlatform(
  platform: string,
): Promise<AICitationCheck[]> {
  return mockAICitationChecks
    .filter((c) => c.platform === platform)
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
}

export async function getAICitationCheck(
  id: string,
): Promise<AICitationCheck | undefined> {
  return mockAICitationChecks.find((c) => c.id === id);
}

export async function insertAICitationCheck(
  check: AICitationCheck,
): Promise<AICitationCheck> {
  mockAICitationChecks.push(check);
  return check;
}
