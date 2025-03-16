import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import axios from "axios";

export const getSetting = async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    if (!settings.length) {
      res.status(404).json({ message: "Setting not found" });
    }
    const setting = settings[0];
    res.status(200).json(setting);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: e.message });
  }
};

export const createSetting = async (req, res) => {
  try {
    // generate token
    const accessToken = jwt.sign(
      {
        id:
          Math.random().toString(36).substring(2, 10) +
          new Date().getTime().toString(36),
      },
      process.env.JWT_SECRET_KEY
    );
    const expiredIn = Date.now() + 3600000;
    const newSetting = await prisma.setting.create({
      data: {
        accessToken,
        expiredIn,
      },
    });
    res.status(201).json(newSetting);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: e.message });
  }
};

export const updateSetting = async (req, res) => {
  try {
    // generate token
    const accessToken = jwt.sign(
      {
        id:
          Math.random().toString(36).substring(2, 10) +
          new Date().getTime().toString(36),
      },
      process.env.JWT_SECRET_KEY
    );
    const expiredIn = Date.now() + 3600000;

    // find first setting
    const setting = await prisma.setting.findFirst();

    const updatedSetting = await prisma.setting.update({
      where: {
        id: setting.id,
      },
      data: {
        accessToken,
        expiredIn,
        shopAccessToken: req.body.shopAccessToken
          ? req.body.shopAccessToken
          : setting.shopAccessToken,
        shopRefreshToken: req.body.shopRefreshToken
          ? req.body.shopRefreshToken
          : setting.shopRefreshToken,
        telegramToken: req.body.telegramToken ? req.body.telegramToken : null,
        telegramReceiver: req.body.telegramReceiver
          ? req.body.telegramReceiver
          : null,
      },
    });
    res.status(200).json(updatedSetting);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: e.message });
  }
};

export const deleteSetting = async (req, res) => {
  try {
    res.status(200).json({ message: "Deleted" });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: e.message });
  }
};

export const getNotis = async (req, res) => {
  try {
    const notis = await prisma.noti.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json(notis);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: e.message });
  }
};
