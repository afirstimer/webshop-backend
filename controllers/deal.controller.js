import prisma from "../lib/prisma.js";
import { generateSign } from "../helper/tiktok.api.js";
import axios from "axios";
import {
  reqCreateActivity,
  reqUpdateActivityProduct,
} from "../services/deal.service.js";
import {
  createActivity,
  createActivityProduct,
} from "../services/promo.service.js";
import { callTiktokApi } from "../services/tiktok.service.js";
import { getPercentPromo } from "../helper/helper.js";

export const getPromos = async (req, res) => {};

export const getPromo = async (req, res) => {
  try {
    const { id, shopId } = req.params;

    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    console.log(shop);

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const extraParams = {
      shop_cipher: shop.tiktokShopCipher,
      shop_id: shop.tiktokShopId,
    };

    console.log(extraParams);

    const response = await callTiktokApi(
      req,
      shop,
      false,
      false,
      "GET",
      `/promotion/202309/activities/${id}`,
      "application/json",
      extraParams
    );
    console.log(response);

    if (response.data.data) {
      res.status(200).json(response.data.data);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const createPromo = async (req, res) => {
  try {
    const {
      shopId,
      activityId,
      pIds,
      discount,
      qtyLimit,
      qtyPerUser,
      activity_type,
      product_level,
    } = req.body;

    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const productIds = [];

    for (let i = 0; i < pIds.length; i++) {
      productIds.push(pIds[i].pId);
    }

    const extraParams = {
      shop_cipher: shop.tiktokShopCipher,
      // version: "202309",
      // shop_id: shop.tiktokShopId,
      // app_key: process.env.TIKTOK_SHOP_APP_KEY,
      // access_token: shop.shopAccessToken,
    };

    let products = [];
    let skus = [];
    for (let i = 0; i < productIds.length; i++) {
      let productResponse = await callTiktokApi(
        req,
        shop,
        false,
        false,
        "GET",
        `/product/202309/products/${productIds[i]}`,
        "application/json",
        {
          shop_cipher: shop.tiktokShopCipher,
          return_under_review_version: false,
        }
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

          let skuPayload = {};
          if (activity_type == "FIXED_PRICE" || activity_type == "FLASHSALE") {
            // calculate amount with dealDiscount
            const amount =
              (productResponse.data.data.skus[j].price.tax_exclusive_price *
                (100 - dealDiscount)) /
              100;
            skuPayload = {
              id: productResponse.data.data.skus[j].id,
              activity_price_amount: amount.toString(),
              quantity_limit: parseInt(qtyLimit),
              quantity_per_user: parseInt(qtyPerUser),
            };
          } else {
            skuPayload = {
              id: productResponse.data.data.skus[j].id,
              discount: dealDiscount.toString(),
              quantity_limit: parseInt(qtyLimit),
              quantity_per_user: parseInt(qtyPerUser),
            };
          }

          productSkus.push(skuPayload);
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

    res.status(200).json(payload);
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: error.message });
  }
};

export const createPromoDetail = async (req, res) => {
  const { shop_id, activity_id, products, activity_type, product_level } =
    req.body;

  try {
    const shop = await prisma.shop.findUnique({
      where: {
        id: shop_id,
      },
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    let newPayload = [];
    for (const product of products) {
      let skus = [];
      for (const sku of product.skus) {
        if (activity_type == "FIXED_PRICE" || activity_type == "FLASHSALE") {
          const amount = sku.activity_price_amount;
          skus.push({
            id: sku.id,
            activity_price_amount: amount.toString(),
            quantity_limit: sku.quantity_limit,
            quantity_per_user: sku.quantity_per_user,
          });
        } else {
          skus.push({
            id: sku.id,
            discount: sku.discount.toString(),
            quantity_limit: sku.quantity_limit,
            quantity_per_user: sku.quantity_per_user,
          });
        }
      }
      newPayload.push({
        id: product.id,
        quantity_limit: product.quantity_limit,
        quantity_per_user: product.quantity_per_user,
        skus: skus,
      });
    }

    // console.log(newPayload);
    const response = await callTiktokApi(
      req,
      shop,
      {
        activity_id: activity_id,
        products: newPayload,
      },
      false,
      "PUT",
      `/promotion/202309/activities/${activity_id}/products`,
      "application/json",
      {
        shop_cipher: shop.tiktokShopCipher,
        app_key: process.env.TIKTOK_SHOP_APP_KEY,
      }
    );

    // console.log(response);

    if (response.data) {
      console.log(response.data);
      res.status(200).json({
        message: response.message,
        code: response.code,
        data: response.data,
      });
    } else {
      console.log(response);
      res.status(500).json({ message: "Error creating promo" });
    }
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: error.message });
  }
};

export const updatePromo = async (req, res) => {};

export const deletePromo = async (req, res) => {
  try {
    const activity_id = req.params.id;

    const shop = await prisma.shop.findUnique({
      where: {
        id: req.params.shopId,
      },
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const response = await callTiktokApi(
      req,
      shop,
      false,
      false,
      "POST",
      `/promotion/202309/activities/${activity_id}/deactivate`,
      "application/json",
      {
        shop_cipher: shop.tiktokShopCipher,
        app_key: process.env.TIKTOK_SHOP_APP_KEY,
      }
    );

    console.log(response.data);

    if (response.data) {
      res.status(200).json({ message: "Promo deleted" });
    }
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: error.message });
  }
};

/**
 * Call TikTok API
 */
export const getCoupons = async (req, res) => {};

/**
 * Call Tiktok API
 */
export const getCoupon = async (req, res) => {};
