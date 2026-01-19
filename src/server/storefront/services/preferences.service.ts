import { preferencesRepository } from "@/server/storefront/repositories/preferences.repository";

export type UpdatePreferencesInput = Partial<{
  promotions: boolean;
  backInStock: boolean;
  priceDrop: boolean;
}>;

class StorefrontPreferencesService {
  async get(userId: string) {
    const row = await preferencesRepository.getOrCreate(userId);
    return row;
  }

  async update(userId: string, patch: UpdatePreferencesInput) {
    const row = await preferencesRepository.update(userId, patch);
    return row;
  }
}

export const storefrontPreferencesService = new StorefrontPreferencesService();
