import { 
  ProductVariantPriceSelectionStrategy, 
  RequestContext, 
  ProductVariantPrice,
} from '@vendure/core';

export class MemberPriceStrategy implements ProductVariantPriceSelectionStrategy {
  /**
   * Trong v3: 
   * - Tham số thứ 2 là một mảng ProductVariantPrice[]
   * - Bạn cần trả về một đối tượng ProductVariantPrice hoặc undefined
   */
  selectPrice(
    ctx: RequestContext,
    prices: ProductVariantPrice[],
  ): ProductVariantPrice | undefined {
    // 1. Tìm giá gốc mặc định (thường là cái đầu tiên hoặc khớp với currency của context)
    const defaultPrice = prices.find(p => p.currencyCode === ctx.currencyCode) || prices[0];

    // 2. Kiểm tra đăng nhập
    const isLoggedIn = !!ctx.activeUserId;

    // 3. Lấy variant từ relation (Vendure v3 tự động join customFields vào variant của price)
    const variant = defaultPrice.variant;
    const memberPrice = (variant?.customFields as any)?.memberPrice;

    // 4. Nếu thỏa điều kiện, tạo một object price ảo cho Member
    if (isLoggedIn && memberPrice != null && memberPrice > 0) {
      return {
        ...defaultPrice,
        price: memberPrice,
      };
    }

    // 5. Trả về giá gốc nếu không thỏa điều kiện
    return defaultPrice;
  }
}