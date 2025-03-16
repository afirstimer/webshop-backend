import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";

export const getTeams = async (req, res) => {
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

    const total = await prisma.listing.count({
      where,
    });

    const teams = await prisma.team.findMany({
      where,
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      orderBy,
    });
    res.status(200).json({
      total,
      page: pageNum,
      limit: pageSize,
      teams,
    });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};

export const getTeam = async (req, res) => {
  try {
    const team = await prisma.team.findUnique({
      where: {
        id: req.params.id,
      },
    });

    // loop team.members and get user details for each member id and add to team.members array
    team.users = [];
    if (team && team.members) {
      for (let i = 0; i < team.members.length; i++) {
        const user = await prisma.user.findUnique({
          where: {
            id: team.members[i],
          },
        });
        team.users[i] = user;
      }
    }
    res.status(200).json(team);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};

export const createTeam = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const newTeam = await prisma.team.create({
      data: {
        name,
      },
    });

    res.status(201).json({
      message: "Team created successfully",
    });
  } catch (e) {
    res.status(500).json({ message: "Failed to create team" });
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};

export const updateTeam = async (req, res) => {
  try {
    const existingTeam = await prisma.team.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!existingTeam) {
      return res.status(404).json({ message: "Team not found" });
    }

    const updatedTeam = await prisma.team.update({
      where: {
        id: req.params.id,
      },
      data: {
        name: req.body.name || existingTeam.name,
        isActive: req.body.isActive || existingTeam.isActive,
      },
    });

    res.status(200).json(updatedTeam);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};

export const addMemberToTeam = async (req, res) => {
  try {
    const { userId } = req.body;

    const team = await prisma.team.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // check userId exists or not in team.members . otherwise add to team.members
    const memberExists = team.members.some((member) => member.id === userId);
    if (memberExists) {
      return res
        .status(400)
        .json({ message: "User already exists in the team" });
    }
    const updatedMembers = [...team.members, userId];

    const updatedTeam = await prisma.team.update({
      where: {
        id: req.params.id,
      },
      data: {
        members: {
          set: updatedMembers,
        },
      },
    });

    if (updateTeam) {
      const updatedUser = await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          teamId: updatedTeam.id,
        },
      });
    }

    res.status(200).json(updatedTeam);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};

export const removeMemberFromTeam = async (req, res) => {
  try {
    const { userId } = req.body;

    const team = await prisma.team.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // check userId exists in team.members
    const memberExists = team.members.some((memberId) => memberId === userId);
    if (!memberExists) {
      return res
        .status(400)
        .json({ message: "User does not exist in the team" });
    }

    // if exists, remove from team.members
    const updatedMembers = team.members.filter(
      (memberId) => memberId !== userId
    );

    const updatedTeam = await prisma.team.update({
      where: {
        id: req.params.id,
      },
      data: {
        members: {
          set: updatedMembers,
        },
      },
    });

    if (updatedTeam) {
      const updatedUser = await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          teamId: null,
        },
      });
    }

    res.status(200).json(updatedTeam);
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};

export const deleteTeam = async (req, res) => {
  try {
    await prisma.team.delete({
      where: {
        id: req.params.id,
      },
    });

    res.status(200).json({ message: "Team deleted successfully" });
  } catch (e) {
    console.log(`Error: ${e.message}\nStack: ${e.stack.split("\n")[1]}`);
  }
};
