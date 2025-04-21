import prisma from "../lib/prisma.js";

export const getTags = async (req, res) => {
  try {
    const tags = await prisma.tag.findMany({});
    res.status(200).json(tags);
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: "Failed to get tags!" });
  }
};

export const getArticlesByTag = async (req, res) => {
  try {
    console.log("Is prisma loaded?", typeof prisma);
    const tag = req.params.slug;
    // Get articles by tag include tag's slug in array
    const articles = await prisma.article.findMany({
      where: {
        tags: {
          has: tag,
        },
      },
    });
    res.status(200).json(articles);
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: "Failed to get articles by tag!" });
  }
};

export const getTag = async (req, res) => {
  try {
    const tag = await prisma.tag.findUnique({
      where: {
        slug: req.params.slug,
      },
    });

    res.status(200).json(tag);
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: "Failed to get tag!" });
  }
};

export const createTag = async (req, res) => {
  try {
    const tag = await prisma.tag.create({
      data: {
        ...req.body,
      },
    });

    res.status(200).json(tag);
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: "Failed to create tag!" });
  }
};

export const updateTag = async (req, res) => {
  try {
    const slug = req.params.slug;
    const tag = await prisma.tag.update({
      where: {
        slug,
      },
      data: req.body,
    });

    res.status(200).json(tag);
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: "Failed to update tag!" });
  }
};

export const deleteTag = async (req, res) => {
  try {
    await prisma.tag.delete({
      where: {
        id: req.params.id,
      },
    });

    res.status(200).json({ message: "Tag deleted successfully" });
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: "Failed to delete tag!" });
  }
};
