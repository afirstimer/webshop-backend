import prisma from "../lib/prisma.js";
import { callTiktokApi } from "./tiktok.service.js";
import { readJSONFile, getPercentPromo } from "../helper/helper.js";
import fs from "fs";
import { title } from "process";

export const reqCreateActivity = async (
  req,
  res,
  shopId,
  productIds,
  startTimeUnix,
  endTimeUnix
) => {
  try {
    const { title } = req.body;

    // HARDCODED
    const activityType = "DIRECT_DISCOUNT";
    const productLevel = "VARIATION";

    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const extraParams = {
      shop_cipher: shop.tiktokShopCipher,
      version: "202309",
      shop_id: shop.tiktokShopId,
    };

    const payload = {
      title: title,
      activity_type: activityType,
      begin_time: startTimeUnix,
      end_time: endTimeUnix,
      product_level: productLevel,
    };

    const response = await callTiktokApi(
      req,
      shop,
      payload,
      false,
      "POST",
      "/promotion/202309/activities",
      "application/json",
      extraParams
    );

    console.log(response);
    if (response.data.data) {
      return response.data.data;
    } else {
      return false;
    }
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const reqUpdateActivity = async (req, res) => {
  try {
    const { shopId, title, beginTime, endTime, activityId } = req.body;

    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const extraParams = {
      shop_cipher: shop.tiktokShopCipher,
      version: "202309",
      shop_id: shop.tiktokShopId,
    };

    const payload = {
      title: title,
      begin_time: beginTime,
      end_time: endTime,
    };

    const response = await callTiktokApi(
      req,
      shop,
      payload,
      false,
      "PUT",
      `/promotion/202309/activities/${activityId}`,
      "application/json",
      extraParams
    );

    if (response.data.data) {
      return res.status(200).json(response.data.data);
    } else {
      return res.status(500).json({ message: "Failed to update activity" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const reqDeleteActivity = async (req, res) => {
  try {
    const { shopId, activityId } = req.body;

    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const extraParams = {
      shop_cipher: shop.tiktokShopCipher,
      version: "202309",
      shop_id: shop.tiktokShopId,
    };

    const response = await callTiktokApi(
      req,
      shop,
      false,
      false,
      "DELETE",
      `/promotion/202309/activities/${activityId}/deactivate`,
      "application/json",
      extraParams
    );

    if (response.data.data) {
      return res.status(200).json(response.data.data);
    } else {
      return res.status(500).json({ message: "Failed to delete activity" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const reqSearchActivities = async (req, res) => {
  try {
    const { shopId, status, activityTitle, pageSize, pageToken } = req.body;

    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const extraParams = {
      shop_cipher: shop.tiktokShopCipher,
      version: "202309",
      shop_id: shop.tiktokShopId,
    };

    const payload = {
      status: status,
      activity_title: activityTitle,
      page_size: pageSize,
      page_token: pageToken,
    };

    const response = await callTiktokApi(
      req,
      shop,
      payload,
      false,
      "POST",
      `/promotion/202309/activities/search`,
      "application/json",
      extraParams
    );

    if (response.data.data) {
      return res.status(200).json(response.data.data);
    } else {
      return res.status(500).json({ message: "Failed to search activities" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const reqUpdateActivityProduct = async (
  req,
  res,
  shopId,
  productIds,
  activityId,
  discount,
  qtyLimit,
  qtyPerUser
) => {
  try {
    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const extraParams = {
      shop_cipher: shop.tiktokShopCipher,
      version: "202309",
      shop_id: shop.tiktokShopId,
      app_key: process.env.TIKTOK_SHOP_APP_KEY,
      access_token: shop.shopAccessToken,
    };

    let products = [];
    let skus = [];
    for (let i = 0; i < productIds.length; i++) {
      let productExtraParams = {
        shop_cipher: shop.tiktokShopCipher,
        return_under_review_version: false,
      };
      let productResponse = await callTiktokApi(
        req,
        shop,
        false,
        false,
        "GET",
        `/product/202309/products/${productIds[i]}`,
        "application/json",
        productExtraParams
      );

      let productSkus = [];
      console.log(productResponse);
      if (productResponse.data.data) {
        // loop productResponse.data.data.skus and push id to productSkus
        for (let j = 0; j < productResponse.data.data.skus.length; j++) {
          // if discount is array
          let dealDiscount = discount;
          if (Array.isArray(discount)) {
            dealDiscount = getPercentPromo(
              productResponse.data.data.skus[j].price.tax_exclusive_price,
              discount
            );
          }
          productSkus.push({
            id: productResponse.data.data.skus[j].id,
            discount: dealDiscount,
            quantity_limit: parseInt(qtyLimit),
            quantity_per_user: parseInt(qtyPerUser),
          });
        }
      }

      products.push({
        id: productIds[i],
        quantity_limit: parseInt(qtyLimit),
        quantity_per_user: parseInt(qtyPerUser),
        skus: productSkus,
      });
    }

    const payload = {
      activity_id: activityId,
      products: products,
    };

    const response = await callTiktokApi(
      req,
      shop,
      payload,
      false,
      "PUT",
      `/promotion/202309/activities/${activityId}/products`,
      "application/json",
      extraParams
    );

    console.log(response);

    if (response.data.data) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const reqRemoveActivityProduct = async (req, res) => {
  try {
    const { shopId, activityId, productIds, skuIds } = req.body;

    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const extraParams = {
      shop_cipher: shop.tiktokShopCipher,
      version: "202309",
      shop_id: shop.tiktokShopId,
    };

    const payload = {
      product_ids: productIds,
      sku_ids: skuIds,
    };

    const response = await callTiktokApi(
      req,
      shop,
      payload,
      false,
      "DELETE",
      `/promotion/202309/activities/${activityId}/products`,
      "application/json",
      extraParams
    );

    if (response.data.data) {
      return res.status(200).json(response.data.data);
    } else {
      return res
        .status(500)
        .json({ message: "Failed to remove activity product" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const reqGetCoupon = async (req, res) => {
  try {
    const { shopId, couponId } = req.body;

    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const extraParams = {
      shop_cipher: shop.tiktokShopCipher,
      version: "202309",
      shop_id: shop.tiktokShopId,
    };

    const response = await callTiktokApi(
      req,
      shop,
      false,
      false,
      "GET",
      `/promotion/202406/coupons/${couponId}`,
      "application/json",
      extraParams
    );

    if (response.data.data) {
      return res.status(200).json(response.data.data);
    } else {
      return res.status(500).json({ message: "Failed to get coupon" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const reqSearchCoupons = async (req, res) => {
  try {
    const { shopId, pageSize, pageToken, status, titleKeyword, displayType } =
      req.body;

    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const extraParams = {
      shop_cipher: shop.tiktokShopCipher,
      version: "202309",
      shop_id: shop.tiktokShopId,
      page_size: pageSize,
      page_token: pageToken,
    };

    const payload = {
      status: status,
      title_keyword: titleKeyword,
      display_type: displayType,
    };

    const response = await callTiktokApi(
      req,
      shop,
      payload,
      false,
      "POST",
      `/promotion/202406/coupons/search`,
      "application/json",
      extraParams
    );

    if (response.data.data) {
      return res.status(200).json(response.data.data);
    } else {
      return res.status(500).json({ message: "Failed to search coupons" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
