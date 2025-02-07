import prisma from '../lib/prisma.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const getProductValueByKey = (productInfo, key) => {
  const actualKey = Object.keys(productInfo).find(k => k.includes(key));
  return actualKey ? productInfo[actualKey] : null;
};

export const createFolder = async (folderPath) => {
  try {        
    await fs.mkdir(folderPath, { recursive: true });
    // console.log("Folder created successfully", folderPath);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

export const readJSONFile = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON file:', error.message);
    return [];
  }
};

export const writeJSONFile = async (filePath, data) => {
  try {    
    // console.log(filePath);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing JSON file:', error.message);
    throw error;
  }
};

export const getDefaultShop = async (req) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return null;

    if (user.defaultShop === null) return null;
    const shop = await prisma.shop.findUnique({ where: { id: user.defaultShop } });
    if (shop) return shop;
  } catch (error) {
    console.log(error);
    return null;
  }
}