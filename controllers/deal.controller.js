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

export const getPromos = async (req, res) => {};

export const getPromo = async (req, res) => {};

export const createPromo = async (req, res) => {
  try {
    const { skus, title, discount, qtyLimit, qtyPerUser, startTime, endTime } =
      req.body;

    // Nhóm skus theo shopId
    const groupedSkus = skus.reduce((acc, { shopId, pId }) => {
      if (!acc[shopId]) acc[shopId] = [];
      acc[shopId].push(pId);
      return acc;
    }, {});

    // Chuyển đổi thời gian sang Unix timestamp
    const startTimeUnix = Math.floor(new Date(startTime).getTime() / 1000);
    const endTimeUnix = Math.floor(new Date(endTime).getTime() / 1000);

    // Loop
    let activities = [];
    for (const shopId in groupedSkus) {
      const activity = await createActivity(
        req,
        res,
        shopId,
        groupedSkus[shopId],
        startTimeUnix,
        endTimeUnix
      );

      if (activity) {
        activities.push({
          id: activity.activity_id,
          shopId: shopId,
        });
      }
    }

    res.status(200).json({ message: "Success", activities: activities });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const createPromoDetail = async (req, res) => {
  const {
    skus,
    title,
    discount,
    qtyLimit,
    qtyPerUser,
    startTime,
    endTime,
    activities,
  } = req.body;

  try {
    // Nhóm skus theo shopId
    const groupedSkus = skus.reduce((acc, { shopId, pId }) => {
      if (!acc[shopId]) acc[shopId] = [];
      acc[shopId].push(pId);
      return acc;
    }, {});

    // Chuyển đổi thời gian sang Unix timestamp
    const startTimeUnix = Math.floor(new Date(startTime).getTime() / 1000);
    const endTimeUnix = Math.floor(new Date(endTime).getTime() / 1000);

    // Loop
    let result = false;
    for (const shopId in groupedSkus) {
      const activityId = activities.find((a) => a.shopId === shopId).id;

      const product = await createActivityProduct(
        req,
        res,
        shopId,
        groupedSkus[shopId],
        activityId,
        discount,
        qtyLimit,
        qtyPerUser
      );

      console.log(product);
    }

    res.status(200).json({ message: "Success" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const updatePromo = async (req, res) => {};

export const deletePromo = async (req, res) => {};

/**
 * Call TikTok API
 */
export const getCoupons = async (req, res) => {};

/**
 * Call Tiktok API
 */
export const getCoupon = async (req, res) => {};
