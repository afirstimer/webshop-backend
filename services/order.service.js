import prisma from "../lib/prisma.js";
import { callTiktokApi } from "./tiktok.service.js";
import { readJSONFile } from "../helper/helper.js";
import fs from "fs";

const ORDER_FOLDER = "./dummy/tiktok/orders/shop/";

export const getTiktokOrders = async (req, shop, payload) => {
  try {
    const extraParams = {
      shop_cipher: shop.tiktokShopCipher,
      page_size: 20,
      sort_order: "DESC",
      page_token: "",
      sort_field: "create_time",
    };

    // if empty payload.nextPageToken, throw error
    if (!payload.nextPageToken) {
      throw new Error("Missing required parameters: nextPageToken");
    }

    if (payload.nextPageToken) {
      extraParams.page_token = payload.nextPageToken;
    }
    const response = await callTiktokApi(
      req,
      shop,
      false,
      false,
      "POST",
      "/order/202309/orders/search",
      "application/json",
      extraParams
    );

    // console.log(response.data);
    if (response.data.data) {
      return response.data.data;
    }
    return false;
  } catch (error) {
    console.log();
  }
};

export const getLocalTiktokOrders = async (shop) => {
  try {
    let page = 1;
    let hasJsonFile = true;
    let orders = [];
    while (hasJsonFile) {
      // get local json file
      const jsonFilePath = ORDER_FOLDER + shop.id + "/" + page + ".json";
      // console.log(jsonFilePath);
      if (!fs.existsSync(jsonFilePath)) {
        hasJsonFile = false;
        break;
      }
      const jsonFileData = await readJSONFile(jsonFilePath);
      if (!jsonFileData) {
        hasJsonFile = false;
        break;
      }
      // console.log(jsonFileData);

      orders = orders.concat(jsonFileData.orders);
      page++;
    }

    // console.log(orders);

    // remove undefined from orders
    orders = orders.filter((order) => order !== undefined);

    // append shop.id to each order
    orders.forEach((order) => {
      if (order !== undefined && order.id) {
        order.shopId = shop.id;
      }
    });

    // console.log(orders);
    return orders;
  } catch (error) {
    console.log(error);
  }
};

export const getTiktokProducts = async (req, shop, payload) => {
  try {
    console.log(shop);
    const extraParams = {
      shop_cipher: shop.tiktokShopCipher,
      page_size: 100,
      page_token: "",
    };

    if (payload.nextPageToken) {
      extraParams.page_token = payload.nextPageToken;
    }
    // console.log(extraParams);
    const response = await callTiktokApi(
      req,
      shop,
      payload,
      false,
      "POST",
      "/product/202312/products/search",
      "application/json",
      extraParams
    );

    // console.log(response.data);
    if (response.data.data) {
      return response.data.data;
    }
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// Hàm định dạng timestamp sang { year, month }
export const formatDate = (timestamp) => {
  const date = new Date(timestamp * 1000);
  return {
    year: date.getFullYear().toString(),
    month: date.toLocaleString("en-US", { month: "long" }),
  };
};

// Tạo danh sách rỗng với các tháng từ tháng 1 đến tháng 12
export const generateEmptyMonths = (year) => {
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

// Nhóm đơn hàng theo năm/tháng
export const aggregateOrders = (orders) => {
  let summary = {};

  orders.forEach((order) => {
    const { year, month } = formatDate(order.create_time);
    const revenue = parseFloat(order.payment.total_amount);

    const key = `${year}-${month}`;
    if (!summary[key]) {
      summary[key] = { year, month, total: 0, revenue: 0 };
    }

    summary[key].total += 1;
    summary[key].revenue += revenue;
  });

  return Object.values(summary);
};
