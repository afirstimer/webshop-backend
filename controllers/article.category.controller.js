import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";

export const getCategories = async (req, res) => {
  try {
    const {
      page = 1,
      limit = process.env.DEFAULT_LIMIT,
      name,
      sort,
    } = req.query;

    const pageNum = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);

    const where = {
      ...(name && {
        name: {
          contains: name,
          mode: "insensitive",
        },
      }),
    };

    const orderBy = (() => {
      switch (sort) {
        case "newest":
          return { createdAt: "desc" };
        case "oldest":
          return { createdAt: "asc" };
        case "updated_newest":
          return { updatedAt: "desc" };
        case "updated_oldest":
          return { updatedAt: "asc" };
        default:
          return { createdAt: "desc" };
      }
    })();

    const total = await prisma.category.count({
      where,
    });

    const categories = await prisma.category.findMany({
      where,
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      orderBy: orderBy,
    });

    res.status(200).json({
      total,
      page: pageNum,
      limit: pageSize,
      categories,
    });
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: "Failed to get categories!" });
  }
};

export const getCategory = async (req, res) => {
  try {
    const slug = req.params.slug;
    const category = await prisma.category.findUnique({
      where: { slug },
    });
    res.status(200).json(category);
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: "Failed to get category!" });
  }
};

export const createCategory = async (req, res) => {
  try {
    const category = await prisma.category.create({
      data: {
        ...req.body,
      },
    });

    res.status(200).json(category);
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: "Failed to create category!" });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const category = await prisma.category.update({
      where: { id },
      data: req.body,
    });

    res.status(200).json(category);
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: "Failed to update category!" });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    await prisma.category.delete({
      where: { id },
    });

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: "Failed to delete category!" });
  }
};

export const getArticlesByCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    const articles = await prisma.article.findMany({
      where: {
        categories: {
          has: slug,
        },
      },
    });
    res.status(200).json(articles);
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: "Failed to get articles by category!" });
  }
};
