import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import { generateSign } from "../helper/tiktok.api.js";
import fetch from "node-fetch";
import axios from "axios";
import { readJSONFile } from "../helper/helper.js";

export const getTemplates = async (req, res) => {
  try {
    const templates = await prisma.template.findMany({});
    res.status(200).json(templates);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};

export const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await prisma.template.findUnique({
      where: {
        id: id,
      },
    });

    const categories = await readJSONFile("./dummy/tiktok/categories.json");
    const category = categories.find((c) => c.id === template.categoryId);
    template.categoryName = category?.name;

    res.status(200).json(template);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};

export const getTemplatesByShop = async (req, res) => {};

export const createTemplate = async (req, res) => {
  try {
    const newTemplate = await prisma.template.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        type: req.body.type,
        productTemplate: req.body.productTemplate,
        productTemplateDescription: req.body.templateDescription,
        categoryId: req.body.categoryId,
        attributes: req.body.attributes,
        compliances: req.body.compliances,
        skus: req.body.skus,
        identifierCode: req.body.identifierCode,
        identifierValue: req.body.identifierCodeValue,
        skuPrice: req.body.skuPrice ? req.body.skuPrice.toString() : null,
        skuQty: req.body.inventoryQuantity,
        skuSeller: req.body.sellerSku,
        isSale: req.body.isSale ? 1 : 0,
        isCOD: req.body.isCOD ? 1 : 0,
        packageWeight: req.body.packageWeightValue,
        packageLength: req.body.packageDimensionLength,
        packageWidth: req.body.packageDimensionWidth,
        packageHeight: req.body.packageDimensionHeight,
      },
    });
    res.status(201).json(newTemplate);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: "Please recheck your inputs" });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTemplate = await prisma.template.update({
      where: {
        id: parseInt(id),
      },
      data: {
        name: req.body.name,
        description: req.body.description,
        type: req.body.type,
        productTemplate: req.body.productTemplate,
        productTemplateDescription: req.body.templateDescription,
        categoryId: req.body.categoryId,
        attributes: req.body.attributes,
        compliances: req.body.compliances,
        skus: req.body.skus,
        identifierCode: req.body.identifierCode,
        skuPrice: req.body.skuPrice ? req.body.skuPrice.toString() : null,
        skuQty: req.body.inventoryQuantity,
        skuSeller: req.body.sellerSku,
        isSale: req.body.isSale ? 1 : 0,
        isCOD: req.body.isCOD ? 1 : 0,
        packageWeight: req.body.packageWeightValue,
        packageLength: req.body.packageDimensionLength,
        packageWidth: req.body.packageDimensionWidth,
        packageHeight: req.body.packageDimensionHeight,
      },
    });

    res.status(200).json(updatedTemplate);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    // find template by id
    const template = await prisma.template.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!template) {
      res.status(404).json({ message: "Template not found" });
    }

    await prisma.template.delete({
      where: {
        id: template.id,
      },
    });

    res.status(200).json({ message: "Template deleted successfully" });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};
