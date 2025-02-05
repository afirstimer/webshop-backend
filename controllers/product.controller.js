import prisma from "../lib/prisma.js";
import {
    uploadImageToTiktok,
    createTiktokProduct,
    getLocalTiktokProducts,
    requestUpdateTiktokProduct,
    fetchAllJsonProducts,
    fetchOriginJsonProducts,
    reqUpdateTiktokPrice
} from "../services/product.service.js";
import { readJSONFile } from "../helper/helper.js";
import { callTiktokApi } from "../services/tiktok.service.js";
import { processSyncProducts } from "../services/shop.service.js";

export const getProducts = async (req, res) => {
    try {
        const { page = 1, limit = process.env.DEFAULT_LIMIT, name, sku, sort } = req.query;

        const pageNum = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);

        const where = {
            ...(name && {
                name: {
                    contains: name,
                    mode: "insensitive",
                },
            }),
            ...(sku && {
                sku: {
                    contains: sku,
                    mode: "insensitive",
                },
            }),
            isActive: 1
        };

        const orderBy = (() => {
            switch (sort) {
                case "newest":
                    return { createdAt: "desc" };
                case "oldest":
                    return { createdAt: "asc" };
                case "updated_newest":
                    return { updatedAt: "desc" };
                case "updated_oldest":
                    return { updatedAt: "asc" };
                default:
                    return { createdAt: "desc" };
            }
        })();

        const total = await prisma.product.count({
            where
        });

        const products = await prisma.product.findMany({
            where,
            include: {
                shop: true,
                listing: true
            },
            skip: (pageNum - 1) * pageSize,
            take: pageSize,
            orderBy
        });

        // loop products and add ListingOnShop        
        for (const product of products) {
            const listingOnShop = await prisma.listingOnShop.findFirst({
                where: {
                    listingId: product.listingId,
                    shopId: product.shopId
                }
            })

            if (listingOnShop) {
                product.listingOnShop = listingOnShop;
            }
        }

        res.status(200).json({
            total,
            page: pageNum,
            limit: pageSize,
            products
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}

export const getJSONProducts = async (req, res) => {
    try {
        const requestUser = await prisma.user.findUnique({
            where: {
                id: req.userId
            }
        });

        if (!requestUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const listingsOnShops = await prisma.listingOnShop.findMany();
        let listings = [];
        if (listingsOnShops) {
            for (const listingOnShop of listingsOnShops) {
                const dbListing = await prisma.listing.findUnique({
                    where: {
                        id: listingOnShop.listingId
                    }
                });
                listings.push({
                    id: listingOnShop.listingId,
                    shopId: listingOnShop.shopId,
                    tiktokProductId: listingOnShop.productTiktokId,
                    listing: dbListing
                });
            }
        }


        if (requestUser.isAdmin == 1) {
            const products = await fetchAllJsonProducts();

            res.status(200).json({ 
                total: products.length,
                products: products 
            });
        } else {
            // get default shop
            const defaultShop = await prisma.shop.findFirst({
                where: {
                    id: requestUser.defaultShop,
                }
            });

            if (!defaultShop) {
                return res.status(404).json({ message: "Default shop not found" });
            }

            const data = await getLocalTiktokProducts(defaultShop);
            res.status(200).json({ products: data });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}

export const getProduct = async (req, res) => { 
    try {
        
    } catch (error) {
        console.log(error);
    }
}

export const getTiktokProduct = async (req, res) => {
    try {
        const {id} = req.params;
        const { shopId } = req.body;

        if (!shopId) {
            return res.status(404).json({ message: "Shop ID not found" });            
        }

        const shop = await prisma.shop.findUnique({
            where: {
                id: shopId
            }
        });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });            
        }

        const extraParams = {
            "shop_cipher": shop.tiktokShopCipher,
            "return_under_review_version": false
        };
        const response = await callTiktokApi(req, shop, false, false, "GET", `/product/202309/products/${id}`, "application/json", extraParams);

        console.log(response.data.data);
        
        let product = {};
        if (response.data.data) {
            const data = response.data.data;
            console.log(data);
            let price = null;
            if (data.skus && data.skus.length > 0 && data.skus[0].price) {
                price = data.skus[0].price.sale_price;
            } else {
                price = '';
            }
            // get last item in category_chains array
            const category = data.category_chains[data.category_chains.length - 1];
            product = {
                id: data.id,
                shopId: shop.id,
                create_time: data.create_time,
                title: data.title,
                price: price,
                description: data.description,
                images: data.main_images,
                status: data.status,
                quality: data.listing_quality_tier,
                category_id: category && category.id,
                package_weight: data.package_weight,
                skus: data.skus
            }

            res.status(200).json(product);
        } else {
            res.status(404).json({ message: "Product not found" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}

export const createProduct = async (req, res) => { }

export const editProduct = async (req, res) => { }

export const uploadCert = async (req, shop, uriImage, res) => {
    try {
        // upload image to tiktok
        const result = await uploadImageToTiktok(req, shop, uriImage, 'CERTIFICATION_IMAGE');
        let image = null;
        if (result.message == 'Success') {
            // create Tiktok Image
            image = await prisma.tiktokImage.create({
                data: {
                    uri: result.data.uri,
                    url: result.data.url,
                    useCase: result.data.use_case
                }
            });
        }

        // upload pdf files to tiktok

        // update certificate with images
        // find existing certificate
        const existingCertificate = await prisma.certificate.findFirst({
            where: {
                listingId: req.body.listingId
            }
        })

        // update listing isCertUpload = 1
        await prisma.listing.update({
            where: {
                id: req.body.listingId
            },
            data: {
                isCertUpload: 1
            }
        });

        if (!existingCertificate) {
            // create new certificate
            const newCertificate = await prisma.certificate.create({
                data: {
                    listingId: req.body.listingId,
                    images: [image.id]
                }
            })
            res.status(200).json(newCertificate);
        } else {
            const updatedCertificate = await prisma.certificate.update({
                where: {
                    id: existingCertificate.id
                },
                data: {
                    images: [...existingCertificate.images, image.id]
                }
            })
            res.status(200).json(updatedCertificate);
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to create certificate' });
    }
}

export const uploadTiktokProducts = async (req, res) => {
    try {
        const { listings, shops, template, draftMode } = req.body;

        // Get existing template
        const existingTemplate = await prisma.template.findFirst({
            where: {
                id: template.id
            }
        })

        // Update template
        let user = await prisma.user.findUnique({
            where: {
                id: req.userId
            }
        });
        console.log(user);

        console.log(existingTemplate);
        console.log(listings);
        console.log(shops);
        console.log(template);
        console.log(draftMode);

        // Loop listings, and submit to tiktok
        // Biến theo dõi trạng thái upload
        let uploadStatus = false;

        // Tạo một mảng promises cho tất cả các thao tác upload
        const uploadTasks = listings.flatMap((listing) =>
            shops.map(async (shop) => {
                try {
                    const response = await createTiktokProduct(req, listing, existingTemplate, shop, draftMode);

                    console.log(response);
                    // status
                    let exportStatus = 'PENDING';
                    let tiktokProductId = null;
                    if (response.data) {
                        tiktokProductId = response.data.product_id;
                        exportStatus = draftMode ? 'DRAFT' : 'SUCCESS';
                    } else {
                        exportStatus = 'FAILURE';
                    }

                    // Tạo ListingOnShop
                    const listingOnShop = await prisma.listingOnShop.create({
                        data: {
                            productTiktokId: tiktokProductId,
                            listingId: listing.id,
                            shopId: shop.id,
                            status: exportStatus,
                        }
                    });
                    console.log(listingOnShop);

                    // Tạo product
                    // không tạo product vì sync từ tiktok về
                    // const product = await prisma.product.create({
                    //     data: {
                    //         name: listing.name,
                    //         description: listing.description,
                    //         price: listing.price,
                    //         listingId: listing.id,
                    //         shopId: shop.id
                    //     }
                    // });
                    // console.log(product);

                    // Tạo log
                    const logg = await prisma.log.create({
                        data: {
                            shopId: shop.id,
                            listingId: listing.id,
                            code: response.code ? response.code.toString() : null,
                            status: exportStatus,
                            payload: JSON.stringify(response)
                        }
                    })
                    console.log(logg);

                    return response;
                } catch (err) {
                    console.error("Error uploading product:", err);
                    return null; // Xử lý lỗi từng shop
                }
            })
        );

        // Đợi tất cả các promises hoàn tất
        const results = await Promise.allSettled(uploadTasks);

        // Kiểm tra trạng thái upload
        uploadStatus = results.some((result) => result.status === 'fulfilled' && result.value);

        // Chờ uploadStatus hoặc timeout sau 20s
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout waiting for uploads to complete")), 20000)
        );

        // Đợi upload hoàn thành hoặc timeout
        await Promise.race([Promise.resolve(uploadStatus), timeout]);

        if (uploadStatus) {
            res.status(200).json({ message: "Success" });
        } else {
            res.status(500).json({ message: "Failed to create products" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
        console.log(error);
    }
}

export const deleteProduct = async (req, res) => {
    try {
        //TODO: DISABLE THIS FUNC
        res.status(200).json({ message: "Success" });

        const { productId, shopId } = req.body;
        const product = await prisma.product.findUnique({
            where: {
                id: productId
            }
        });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const shop = await prisma.shop.findUnique({
            where: {
                id: shopId
            }
        });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const listingOnShop = await prisma.listingOnShop.findUnique({
            where: {
                listingId_shopId: {
                    listingId: product.listingId,
                    shopId: shopId
                }
            }
        });
        if (!listingOnShop) {
            return res.status(404).json({ message: "Listing on shop not found" });
        }

        const extraParams = {
            'shop_cipher': shop.tiktokShopCipher,
            'listing_platforms': ['TIKTOK_SHOP'],
            'product_ids': [product.id],
            'version': '202309',
            'shop_id': defaultShop.tiktokShopId
        }

        const response = await callTiktokApi(req, shop, payload, false, "POST", "/product/202309/products/deactivate", "application/json", extraParams);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}

export const updateTiktokProduct = async (req, res) => {
    try {
        const {shopId, originProduct, title, description, images} = req.body;

        const shop = await prisma.shop.findUnique({
            where: {
                id: shopId
            }
        });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }        

        const newProduct = {
            title: title,
            description: description,
            images: images
        }

        const response = await requestUpdateTiktokProduct(req, originProduct, newProduct, shop);
        
        console.log(response);
        if (response) {            
            res.status(200).json({ message: "Success" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}

export const updateTiktokPrice = async (req, res) => {
    try {
        const {products, percentage} = req.body;

        console.log(products, percentage);

        // Fetch json products
        const jsonProducts = await fetchOriginJsonProducts();

        // Find SKUs
        let findSkus = [];
        jsonProducts.forEach(jPr => {
            products.forEach(p => {
                if (jPr.id == p.pId) {                    
                    findSkus.push({
                        shopId: p.shopId,
                        pId: p.pId,
                        skus: jPr.skus
                    });
                }
            })
        });

        console.log(findSkus);        
        
        // Update prices
        const resp = await reqUpdateTiktokPrice(req, findSkus, percentage);

        res.status(200).json({ result: resp, message: "Success" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}

