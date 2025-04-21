import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { slugify } from "../services/article.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getArticles = async (req, res) => {
  try {
    const {
      page = 1,
      limit = process.env.DEFAULT_LIMIT,
      title,
      sort,
    } = req.query;

    const pageNum = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);

    const where = {
      ...(title && {
        title: {
          contains: title,
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

    const total = await prisma.article.count({
      where,
    });

    const articles = await prisma.article.findMany({
      where,
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      orderBy: orderBy,
    });

    res.status(200).json({
      total,
      page: pageNum,
      limit: pageSize,
      articles,
    });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: "Failed to get articles!" });
  }
};

export const getArticle = async (req, res) => {
  try {
    const slug = req.params.slug;
    const article = await prisma.article.findUnique({
      where: { slug },
    });
    res.status(200).json(article);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);

    res.status(500).json({ message: "Failed to get article!" });
  }
};

export const createArticle = async (req, res) => {
  try {
    const article = await prisma.article.create({
      data: {
        ...req.body,
      },
    });

    res.status(200).json(article);
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: "Failed to create article!" });
  }
};

export const updateArticle = async (req, res) => {
  try {
  } catch (error) {}
};

export const deleteArticle = async (req, res) => {
  try {
  } catch (error) {}
};

export const crawlArticle = async (req, res) => {
  const { url, tags, category, type } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    const title = $("h1").first().text().trim();
    const excerpt = $("h2").first().text().trim();
    const publishedAt = $("time").attr("datetime");
    const author = $('[rel="author"]').first().text().trim();

    const $content = $(".entry-content").first().clone();

    // Get image srcs from <figure><img>
    const imageUrls = $content
      .find("figure img")
      .map((i, el) => $(el).attr("src"))
      .get()
      .filter(Boolean); // Remove undefined/null

    const content = $(".entry-content > p")
      .map((i, el) => $(el).text().trim())
      .get()
      .join("\n\n");

    const categories = [category];

    // generate slug from title
    const slug = await slugify(title);

    const articleData = {
      title,
      excerpt,
      publishedAt,
      content,
      media: imageUrls,
      tags,
      categories,
      type,
      polls: [],
      authorId: null,
      slug,
    };

    // create author
    const authorData = {
      name: author,
    };

    const createdAuthor = await prisma.author.create({
      data: authorData,
    });

    articleData.authorId = createdAuthor.id;
    // create article
    const createdArticle = await prisma.article.create({
      data: articleData,
    });

    res.status(200).json(createdArticle);
  } catch (err) {
    console.error("Crawl error:", err.message);
    res.status(500).json({ error: "Failed to crawl article." });
  }
};
