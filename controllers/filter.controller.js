import prisma from "../lib/prisma.js";

export const getFilter = async (req, res) => {
    try {
        // get first filter
        const filter = await prisma.filter.findFirst();

        // if not found, create one
        if (!filter) {
            const newFilter = await prisma.filter.create({});
            res.status(201).json(newFilter);
        } else {
            res.status(200).json(filter);
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}

export const updateFilter = async (req, res) => {
    try {
        const { asin } = req.body;
        // find first filter
        let filter = await prisma.filter.findFirst();

        // if not found, create one
        if (!filter) {
            filter = await prisma.filter.create({});
        }

        // update filter
        const updatedFilter = await prisma.filter.update({
            where: {
                id: filter.id
            },
            data: {
                asin: asin
            }
        });
        res.status(200).json(updatedFilter);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}

