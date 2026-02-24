import { bootstrap, RequestContext, CollectionService, ProductService, ProductVariantService, ChannelService, LanguageCode, Product, ProductVariant } from '@vendure/core';
import { config } from './vendure-config';
import 'dotenv/config';

interface MisaProduct {
    InventoryItemID: string;
    SKUCode: string;
    InventoryItemName: string;
    InventoryItemCategoryID: string;
    UnitPrice: number;
    CostPrice: number;
    UnitID: string;
    Weight: number;
    Length: number;
    Width: number;
    Height: number;
    BrandName: string;
    Description: string;
    ItemCategoryName: string;
    [key: string]: any;
}

interface MisaResponse {
    Code: number;
    Data: MisaProduct[];
    Total: number;
    Success: boolean;
    Environment: string;
}

async function syncMisaProducts() {
    console.log('Bootstrapping Vendure...');
    const app = await bootstrap({
        ...config,
        apiOptions: { ...config.apiOptions, port: 0 }
    });

    const collectionService = app.get(CollectionService);
    const productService = app.get(ProductService);
    const productVariantService = app.get(ProductVariantService);
    const channelService = app.get(ChannelService);

    const channel = await channelService.getDefaultChannel();
    const ctx = new RequestContext({
        channel,
        apiType: 'admin',
        isAuthorized: true,
        authorizedAsOwnerOnly: false,
    });

    console.log('Fetching existing Vendure Collections to map categories...');
    const collectionMap = new Map<string, string>(); // misaId -> collection.id
    const take = 100;
    let skip = 0;
    let hasMoreCols = true;

    while (hasMoreCols) {
        const existingCollections = await collectionService.findAll(ctx, { take, skip });
        for (const collection of existingCollections.items) {
            if ((collection.customFields as any).misaId) {
                collectionMap.set((collection.customFields as any).misaId, collection.id as string);
            }
        }
        skip += take;
        hasMoreCols = skip < existingCollections.totalItems;
    }
    console.log(`Mapped ${collectionMap.size} collections from Vendure.`);

    console.log('Fetching existing Vendure Product Variants to avoid duplicates...');
    const variantSkuMap = new Map<string, string>(); // sku -> variant.id
    skip = 0;
    let hasMoreVariants = true;

    while (hasMoreVariants) {
        const existingVariants = await productVariantService.findAll(ctx, { take, skip });
        for (const variant of existingVariants.items) {
            variantSkuMap.set(variant.sku, variant.id as string);
        }
        skip += take;
        hasMoreVariants = skip < existingVariants.totalItems;
    }
    console.log(`Mapped ${variantSkuMap.size} existing product variants.`);

    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    let apiStart = 0;
    const apiLimit = 50;
    let totalItems = 0;

    console.log('Starting Misa Product Sync via API Pagination...');

    do {
        const apiUrl = `https://ducngocshop.mshopkeeper.vn/backendg1/api/InventoryItem?_dc=1771914003513&inventoryItemCategoryID=00000000-0000-0000-0000-000000000000&branchID=0b23dd91-e070-4b33-bddf-e05e9cff3264&isOutStock=0&page=${Math.floor(apiStart / apiLimit) + 1}&start=${apiStart}&limit=${apiLimit}&sort=%5B%7B%22property%22%3A%22InventoryItemName%22%2C%22direction%22%3A%22ASC%22%7D%5D&filter=%5B%7B%22xtype%22%3A%22filter%22%2C%22isFilterRow%22%3Atrue%2C%22property%22%3A%22Inactive%22%2C%22operator%22%3A0%2C%22value%22%3A0%2C%22type%22%3A7%7D%5D`;

        console.log(`Fetching Misa Products (start: ${apiStart}, limit: ${apiLimit})...`);
        const response = await fetch(apiUrl, {
            "headers": {
                "accept": "application/json",
                "authorization": "Bearer 4NjkUo8lDYc7wI4Wrg5Mtwb5oeDAxybpWYN6AOgOzSbHzbjoZAmdKnXaMGI5KPzkyX2Drm5bDMw0yCyS7aPGGNauEv0TaTY3R1_hWUxgfu3fNnQmvYb30soOJMpeRz-2RNEgmxK2vB87e3_LvJQYcaDRUl7p0oFvf1kYDfgygik3MUdt0Nsbhrrbwr8rqFy_Dwr9vwVhNOXfVG9k0h_AIP1VNqlCJzz8KOFeX67FAZxa0KCoiqwgBNn2tPtAlO5YeLGgbYYoGi3MMlRoegK6urrLlOrJxyHEtTrcpDDjANYdPA3wHyl8FUt9QZDVvlpbOXrUy0m6ppsqeOpIVUubJPaUYfvD6_QcP5E00knRnQoe_5UZbPzA2_Ian5vYJCDOW_DoU-4T358NgXLZQQQcI4VxShheJVRruUw0cksguvY1mZYeBnG03tlu6f2LH8Vpe5oErOETqpu8BqMHLlcW8RM_bpcDdK19IJ7V2-sKq_x_DQ4M_lPR8NOB2mbKLUCbWkasNNxfEMDTTDOnMmZnOma6jVn5ebiBJddjDwavr3WLF4fv20k9tkl9LhVJsHpbJ7trihBcCcyEDSNmG73PcFdEGu8yd_q7mA-ChFrMEKZ_tn87F-86iDoKrqmpIgmyUiNZ3bNoR5QpKua6lSg7QaW38Mgx3RAQnRa1lYRTsCzmu7iKw5r1dPT0oBLQjsqYmkanALLAB7m5q7fzQuiU5nlPDzglehH_bemazsroUUc",
                "companycode": "ducngocshop",
                "x-misa-branchid": "0b23dd91-e070-4b33-bddf-e05e9cff3264",
                "cookie": "_gid=GA1.2.257613911.1771818706; _gcl_au=1.1.1973455688.1771818708; initialTrafficSource=utmccn=(not set); _fbp=fb.1.1771818708759.363375511701064677; x-deviceid=5e0bb97dc43942e78b0a02fde13a6e9a; _ga_04GRFG1GEE=GS2.1.s1771818708$o1$g1$t1771819186$j60$l0$h0; _ga_64YCPP0PNS=GS2.1.s1771843707$o2$g0$t1771843707$j60$l0$h0; _ga_5RQ0H2DBF0=GS2.1.s1771845016$o48$g0$t1771845016$j60$l0$h0; _ga_877E0J2DYM=GS2.1.s1771845016$o50$g0$t1771845016$j60$l0$h0; ASP.NET_SessionId=j4xe1nerylajlm3x2onmkbic; ducngocshop_Token=7cefc80c5aee49518b57ad965df04027; _gat=1; _ga=GA1.1.1274169688.1768790905; _ga_YLF50693DS=GS2.1.s1771913960$o5$g1$t1771913964$j56$l0$h0; _ga_D8GFJLDVNQ=GS2.2.s1771913961$o6$g1$t1771913972$j49$l0$h0"
            },
            "method": "GET"
        });

        if (!response.ok) {
            console.error(`Failed to fetch from Misa API: ${response.status} ${response.statusText}`);
            process.exit(1);
        }

        const resData = await response.json() as MisaResponse;
        if (!resData.Success || !resData.Data) {
            console.error("Misa API returned an error or no data:", resData);
            break;
        }

        totalItems = resData.Total;

        for (const misaItem of resData.Data) {
            const isExisting = variantSkuMap.has(misaItem.SKUCode);

            if (!isExisting) {
                // Determine Collection ID to assign to
                const collectionId = collectionMap.get(misaItem.InventoryItemCategoryID);

                try {
                    // Create Product First
                    const newProduct = await productService.create(ctx, {
                        translations: [{
                            languageCode: LanguageCode.vi,
                            name: misaItem.InventoryItemName,
                            slug: misaItem.SKUCode.toLowerCase(),
                            description: misaItem.Description || '',
                        }],
                        customFields: {
                            misaId: misaItem.InventoryItemID,
                            brandName: misaItem.BrandName || '',
                        }
                    });

                    // Vendors require assigning to current channel if API type is admin
                    await channelService.assignToChannels(ctx, Product, newProduct.id, [channel.id]);

                    // Add to Collection if found
                    if (collectionId) {
                        try {
                            const collection = await collectionService.findOne(ctx, collectionId);
                            // Vendure API v3 workaround: assignment varies, commonly variant assignment or direct collection API
                            // usually done via assignProductsToCollection or similar, or variants assigned. Wait to see if error thrown.
                        } catch (e) {
                            console.log("Error loading collection for product");
                        }
                    }

                    // Create Product Variant
                    // Usually taxCategoryId 1 is standard rate in Vendure default seed
                    const newVariant = await productVariantService.create(ctx, [{
                        productId: newProduct.id as string,
                        sku: misaItem.SKUCode,
                        price: Number(misaItem.UnitPrice.toFixed(0) || 0), // price
                        taxCategoryId: 1, // Standard Tax Category
                        translations: [{
                            languageCode: LanguageCode.vi,
                            name: misaItem.InventoryItemName,
                        }],
                        customFields: {
                            misaId: misaItem.InventoryItemID,
                            purchasePrice: Number(misaItem.CostPrice.toFixed(0) || 0),
                            unitId: misaItem.UnitID, // could be an object if not defined strictly
                            weight: misaItem.Weight || 0,
                            length: misaItem.Length || 0,
                            width: misaItem.Width || 0,
                            height: misaItem.Height || 0,
                        }
                    }]);

                    // Assign variant to channel
                    await channelService.assignToChannels(ctx, ProductVariant, newVariant[0].id, [channel.id]);

                    variantSkuMap.set(misaItem.SKUCode, newVariant[0].id as string);
                    createdCount++;
                    console.log(`[Created] ${misaItem.InventoryItemName} (SKU: ${misaItem.SKUCode})`);

                } catch (err: any) {
                    console.error(`[Error] Failed to create product ${misaItem.InventoryItemName}:`, err.message);
                    failedCount++;
                }
            } else {
                // Update
                try {
                    const variantId = variantSkuMap.get(misaItem.SKUCode)!;

                    const updatedVariant = await productVariantService.update(ctx, [{
                        id: variantId,
                        price: Number(misaItem.UnitPrice.toFixed(0) || 0),
                        customFields: {
                            misaId: misaItem.InventoryItemID,
                            purchasePrice: Number(misaItem.CostPrice.toFixed(0) || 0),
                            unitId: misaItem.UnitID,
                            weight: misaItem.Weight || 0,
                            length: misaItem.Length || 0,
                            width: misaItem.Width || 0,
                            height: misaItem.Height || 0,
                        }
                    }]);

                    if (updatedVariant && updatedVariant[0]) {
                        // Force assign to channel just in case it was created without a channel context initially
                        await channelService.assignToChannels(ctx, ProductVariant, variantId, [channel.id]);
                        await channelService.assignToChannels(ctx, Product, updatedVariant[0].productId, [channel.id]);
                    }

                    updatedCount++;
                    console.log(`[Updated] ${misaItem.InventoryItemName} (SKU: ${misaItem.SKUCode})`);
                } catch (err: any) {
                    console.error(`[Error] Failed to update product variant ${misaItem.InventoryItemName}:`, err.message);
                    failedCount++;
                }
            }
        }

        apiStart += apiLimit;

    } while (apiStart < totalItems);

    console.log(`Product Sync Complete! Created: ${createdCount}, Updated: ${updatedCount}, Failed: ${failedCount}`);

    await app.close();
    process.exit(0);
}

syncMisaProducts().catch(err => {
    console.error(err);
    process.exit(1);
});
