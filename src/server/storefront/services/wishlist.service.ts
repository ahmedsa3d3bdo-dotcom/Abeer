import { storefrontWishlistRepository } from "../repositories/wishlist.repository";
import type { WishlistItem, ProductCard } from "@/types/storefront";

export class StorefrontWishlistService {
  async list(userId: string): Promise<WishlistItem[]> {
    return storefrontWishlistRepository.listItems(userId) as any;
  }

  async add(userId: string, productId: string): Promise<WishlistItem[]> {
    return storefrontWishlistRepository.addItem(userId, productId) as any;
  }

  async remove(userId: string, productId: string): Promise<WishlistItem[]> {
    return storefrontWishlistRepository.removeItem(userId, productId) as any;
  }

  async merge(userId: string, productIds: string[]): Promise<WishlistItem[]> {
    return storefrontWishlistRepository.merge(userId, productIds) as any;
  }

  async clear(userId: string): Promise<void> {
    await storefrontWishlistRepository.clearItems(userId);
  }
}

export const storefrontWishlistService = new StorefrontWishlistService();
