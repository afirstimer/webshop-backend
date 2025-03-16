import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { callTiktokApi } from "../services/tiktok.service.js";

export const getWarehouses = async (req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany();
    res.status(200).json(warehouses);
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );
    res.status(500).json({ message: error.message });
  }
};

export const getWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await prisma.warehouse.findUnique({
      where: {
        id,
      },
    });

    res.status(200).json(warehouse);
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );
    res.status(500).json({ message: error.message });
  }
};

export const createWarehouse = async (req, res) => {
  try {
    // same with sync (should call once)
    // get default shop
    const shop = await getDefaultShop(req);
    if (!shop) {
      return res.status(404).json({ message: "Default shop not found" });
    }

    const extraParams = {
      shop_cipher: shop.tiktokShopCipher,
      access_token: shop.shopAccessToken,
    };
    const resp = await callTiktokApi(
      req,
      shop,
      false,
      false,
      "GET",
      `/logistics/202309/warehouses`,
      "application/json",
      extraParams
    );

    if (resp.data.data) {
      const warehouses = resp.data.data.warehouses;
      for (let i = 0; i < warehouses.length; i++) {
        const warehouse = warehouses[i];
        const existingWarehouse = await prisma.warehouse.findFirst({
          where: {
            tiktokId: warehouse.id,
          },
        });

        if (!existingWarehouse) {
          await prisma.warehouse.create({
            data: {
              address: warehouse.address,
              status: warehouse.effect_status,
              tiktokId: warehouse.id,
              isDefault: warehouse.is_default ? 1 : 0,
              name: warehouse.name,
              subType: warehouse.sub_type,
              type: warehouse.type,
            },
          });
        }
      }
    }

    res.status(200).json({ message: "Success" });
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );
    res.status(500).json({ message: error.message });
  }
};
