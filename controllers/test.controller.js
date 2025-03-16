import prisma from "../lib/prisma.js";
import {
  getWarehouseDelivery,
  uploadImageToTiktok,
} from "../services/product.service.js";
import TelegramBot from "node-telegram-bot-api";
import { proceedRefreshToken } from "../helper/helper.js";

export const testController = async (req, res) => {
  try {
    const shops = await prisma.shop.findMany({});

    res.status(200).json(shops);
  } catch (error) {
    console.log(error);
  }
};
