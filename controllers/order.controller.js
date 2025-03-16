import prisma from "../lib/prisma.js";
import {
  aggregateOrders,
  formatDate,
  generateEmptyMonths,
  getLocalTiktokOrders,
  getTiktokOrders,
} from "../services/order.service.js";
import { getDefaultShop } from "../helper/helper.js";
import { reqActiveShops } from "../services/shop.service.js";
import { getAllShops } from "./shop.controller.js";
import { callTiktokApi } from "../services/tiktok.service.js";

export const getOrderStats = async (req, res) => {
  try {
    const { year } = req.query;

    // default is current year if no year
    let yearQuery = year;
    if (!year) {
      const date = new Date();
      yearQuery = date.getFullYear();
    }

    // get requested user
    const requestUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
    });

    if (!requestUser) {
      return res.status(500).json({ error: "Failed to get user" });
    }

    let orders = [];
    // if admin, get full shops
    if (requestUser.isAdmin == 1) {
      const shops = await prisma.shop.findMany({});
      if (!shops) {
        return res.status(500).json({ error: "Failed to get shops" });
      }

      for (const shop of shops) {
        const localOrders = await getLocalTiktokOrders(shop);
        orders = orders.concat(localOrders);
      }
    } else {
      // get default shop
      const shop = await getDefaultShop(req);

      if (!shop) {
        return res.status(500).json({ error: "Failed to get shop" });
      }

      const localOrders = await getLocalTiktokOrders(shop);
      if (!localOrders) {
        return res.status(500).json({ error: "Failed to get orders" });
      }

      orders = localOrders;
    }

    // Chuyển timestamp -> { year, month }
    const formatDate = (timestamp) => {
      const date = new Date(timestamp * 1000);
      return {
        year: date.getFullYear().toString(),
        month: date.toLocaleString("en-US", { month: "long" }),
      };
    };

    // Tạo danh sách 12 tháng rỗng
    const generateEmptyMonths = (year) => {
      const months = Array.from({ length: 12 }, (_, i) =>
        new Date(year, i).toLocaleString("en-US", { month: "long" })
      );
      return months.map((month) => ({
        year: year.toString(),
        month,
        total: 0,
        revenue: 0,
      }));
    };

    // Lọc đơn hàng theo `year`
    const filteredOrders = orders.filter(
      (order) => formatDate(order.create_time).year === yearQuery
    );

    // Nhóm đơn hàng theo tháng
    let summary = {};
    filteredOrders.forEach((order) => {
      const { month } = formatDate(order.create_time);
      const revenue = parseFloat(order.payment.total_amount);

      if (!summary[month]) {
        summary[month] = { year, month, total: 0, revenue: 0 };
      }
      summary[month].total += 1;
      summary[month].revenue += revenue;
    });

    // Gộp với danh sách tháng rỗng
    const emptyMonths = generateEmptyMonths(year);
    const analysis = emptyMonths.map((empty) => summary[empty.month] || empty);

    res.status(200).json(analysis);
  } catch (error) {
    console.error("Error get orders: ", error);
    res.status(500).json({ error: "Failed to get orders" });
  }
};

export const getOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany();
    res.status(200).json(orders);
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ error: "Failed to get orders" });
  }
};

export const getAllShopOrders = async (req, res) => {
  try {
    const reqUser = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
    });
    if (!reqUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (reqUser.isAdmin == 1) {
      const shops = await reqActiveShops();
      let orders = [];
      for (const shop of shops) {
        const localOrders = await getLocalTiktokOrders(shop);
        orders = orders.concat(localOrders);
      }
      res.status(200).json(orders);
    } else {
      // get default shop
      const shop = await getDefaultShop(req);
      if (!shop) {
        return res.status(404).json({ message: "Default shop not found" });
      }
      const orders = await getLocalTiktokOrders(shop);
      res.status(200).json(orders);
    }
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ e: "Failed to get orders" });
  }
};

export const getTiktokOrder = async (req, res) => {
  try {
    const { shopId, id } = req.params;

    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // find order in tiktok
    const extraParams = {
      shop_cipher: shop.tiktokShopCipher,
      shop_id: shop.tiktokShopId,
      ids: id,
    };

    const result = await callTiktokApi(
      req,
      shop,
      false,
      false,
      "GET",
      `/order/202309/orders`,
      "application/json",
      extraParams
    );

    if (result.data.data) {
      res.status(200).json({ order: result.data.data });
    }
  } catch (editProduct) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: e.message });
  }
};
