import prisma from "../lib/prisma.js";

export const createSurvey = async (req, res) => {
  try {
    const {
      question1,
      question2,
      question3,
      question4,
      question5,
      gift,
      idType,
      address,
      photo,
    } = req.body;

    const data = {
      answers: [question1, question2, question3, question4, question5, gift],
      licenseType: idType,
      fullName: address.name,
      address: address.address,
      state: address.state,
      city: address.city,
      zipcode: address.zipcode,
      phone: address.phone,
      photoUrl: photo,
    };

    const survey = await prisma.survey.create({ data });
    res.status(200).json(survey);
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: "Failed to create survey!" });
  }
};
