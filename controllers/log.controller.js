import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import axios from "axios";

export const getLogs = async (req, res) => {
  try {
    const logs = await prisma.log.findMany();
    res.status(200).json(logs);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};

export const getLog = async (req, res) => {};

export const createLog = async (req, res) => {
  try {
    const { shopId, productId, code, status, payload } = req.body;
    const data = await prisma.log.create({
      data: {
        shopId,
        productId,
        code,
        status,
        payload,
      },
    });
    res.status(200).json(data);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: e.message });
  }
};
