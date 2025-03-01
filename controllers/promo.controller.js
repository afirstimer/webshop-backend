import prisma from "../lib/prisma.js";
import { generateSign } from "../helper/tiktok.api.js";
import axios from "axios";
import moment from "moment-timezone";
import {
  fetchAllJsonPromos,
  getAllShopLocalPromos,
  getLocalPromos,
  getLocalTiktokPromos,
} from "../services/promo.service.js";
import { callTiktokApi } from "../services/tiktok.service.js";

export const getPromos = async (req, res) => {
  try {
    const requestUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
    });

    if (!requestUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (requestUser.isAdmin == 1) {
      const promos = await getAllShopLocalPromos();

      for (const promo of promos) {
        promo.shopId = product.shop.id;
      }

      res.status(200).json({
        total: promos.length,
        promos: promos,
      });
    } else {
      // get default shop
      const defaultShop = await prisma.shop.findFirst({
        where: {
          id: requestUser.defaultShop,
        },
      });

      if (!defaultShop) {
        return res.status(404).json({ message: "Default shop not found" });
      }

      const data = await getLocalPromos(defaultShop);
      // loop data and add shopId
      for (const promo of data) {
        promo.shopId = defaultShop.id;
      }
      res.status(200).json({ promos: data });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const getJSONPromos = async (req, res) => {
  try {
    const requestUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
    });

    if (!requestUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (requestUser.isAdmin == 1) {
      const promos = await fetchAllJsonPromos();

      res.status(200).json({
        total: promos.length,
        promos: promos,
      });
    } else {
      // get default shop
      const defaultShop = await prisma.shop.findFirst({
        where: {
          id: requestUser.defaultShop,
        },
      });

      if (!defaultShop) {
        return res.status(404).json({ message: "Default shop not found" });
      }

      const data = await getLocalTiktokPromos(defaultShop);
      // loop data and add shopId
      for (const product of data) {
        product.shopId = defaultShop.id;
      }
      res.status(200).json({ products: data });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const getPromo = async (req, res) => {
  try {
    const { id } = req.params;
    const { shopId } = req.query;

    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    console.log(shop);

    // find promo in tiktok
    const extraParams = {
      shop_cipher: shop.tiktokShopCipher,
      shop_id: shop.tiktokShopId,
    };

    const result = await callTiktokApi(
      req,
      shop,
      false,
      false,
      "GET",
      `/promotion/202309/activities/${id}`,
      "application/json",
      extraParams
    );

    console.log(result.data);
    if (result.data.data) {
      res.status(200).json({ promo: result.data.data });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const createPromo = async (req, res) => {
  try {
    const { shopId, title, activityType, beginTime, endTime, productLevel } =
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
      shop_id: shop.tiktokShopId,
    };

    const payload = {
      title: title,
      activity_type: activityType,
      begin_time: moment.tz(beginTime, "America/Los_Angeles").unix(),
      end_time: moment.tz(endTime, "America/Los_Angeles").unix(),
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

    if (response.data.data) {
      res.status(200).json({ message: "Promo created successfully" });
    }
  } catch (error) {
    console.log(error);
  }
};

export const updatePromo = async (req, res) => {};

export const updatePromoProducts = async (req, res) => {};

export const removePromoProducts = async (req, res) => {};

export const getCoupons = async (req, res) => {};
