import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import axios from "axios";
import { connectViaSocks5 } from "../services/proxy.service.js";

export const getProxies = async (req, res) => {
  try {
    const proxies = await prisma.proxy.findMany({
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    res.status(200).json(proxies);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const getProxy = async (req, res) => {
  try {
    const proxy = await prisma.proxy.findUnique({
      where: {
        id: req.params.id,
      },
    });

    res.status(200).json(proxy);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const createProxy = async (req, res) => {
  try {
    const { name, type, hostname, port, username, password } = req.body;

    const newProxy = await prisma.proxy.create({
      data: {
        name,
        type,
        hostname,
        port,
        username,
        password,
      },
    });

    res.status(201).json(newProxy);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const updateProxy = async (req, res) => {
  try {
    const { name, shopId, type, hostname, port, username, password, isActive } =
      req.body;

    const updatedProxy = await prisma.proxy.update({
      where: {
        id: req.params.id,
      },
      data: {
        name,
        shopId,
        type,
        hostname,
        port,
        username,
        password,
        isActive,
      },
    });

    res.status(200).json(updatedProxy);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteProxy = async (req, res) => {
  try {
    await prisma.proxy.delete({
      where: {
        id: req.params.id,
      },
    });

    res.status(200).json({ message: "Proxy deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const connectViaProxy = async (req, res) => {
  try {
    const { shopId } = req.body;

    if (!shopId) {
      return res.status(400).json({ message: "Shop ID is required" });
    }

    const shop = await prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const client = await connectViaSocks5(shop);
    if (!client) {
      return res.status(500).json({ message: "Failed to connect to proxy" });
    }
    res.status(200).json({ message: "Connected to proxy" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
