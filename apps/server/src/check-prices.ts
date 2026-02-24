import { bootstrap, RequestContext, ProductVariantService, ChannelService } from '@vendure/core';
import { config } from './vendure-config';

async function check() {
    const app = await bootstrap({
        ...config,
        apiOptions: { ...config.apiOptions, port: 0 }
    });

    const productVariantService = app.get(ProductVariantService);
    const channelService = app.get(ChannelService);

    // Create Context
    const channel = await channelService.getDefaultChannel();
    const ctx = new RequestContext({
        channel,
        apiType: 'admin',
        isAuthorized: true,
        authorizedAsOwnerOnly: false,
    });

    // Fetch total and top 20 items
    const result = await productVariantService.findAll(ctx, {
        take: 500
    });

    console.log(`\n=== TỔNG QUAN HỆ THỐNG ===`);
    console.log(`>> Tổng số lượng sản phẩm (biến thể) hiện tại trong cửa hàng: ${result.totalItems}\n`);
    console.log(`=== DANH SÁCH 20 SẢN PHẨM MẪU ===`);

    const tableData = result.items.map(v => ({
        'SKU': v.sku,
        'Tên sản phẩm': v.name,
        'Giá bán (VND)': v.price
    }));

    console.table(tableData);

    await app.close();
    process.exit(0);
}

check().catch(console.error);
