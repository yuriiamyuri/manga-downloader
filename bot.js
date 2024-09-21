import TelegramBot from "node-telegram-bot-api";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { config } from "dotenv";
import {
  getMainPage,
  getSpecificMangaInfo,
  getChapterPages,
  getSpecificMangaInfoLink,
} from "./mangaScraper.js";
import { createPDFWithImages } from "./index.js";

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

// Constants for pagination
const BUTTONS_PER_PAGE = 64; // Maximum number of buttons per page (8 rows * 8 buttons)

// Utility function to paginate chapters
const paginateChapters = (chapters, page = 1) => {
  const totalPages = Math.ceil(chapters.length / BUTTONS_PER_PAGE);
  const start = (page - 1) * BUTTONS_PER_PAGE;
  const end = start + BUTTONS_PER_PAGE;
  const currentChapters = chapters.slice(start, end);

  let inline_keyboard = [];
  let row = [];
  let counter = 0;

  currentChapters.forEach((chp, index) => {
    if (index % 4 === 3) {
      // For every 4th chapter, create a row with 1 button
      inline_keyboard.push([
        {
          text: chp.chapterNumber,
          callback_data: ("chP/" + decodeURIComponent(chp.link) + "|" + chp.chapterNumber).slice(
            0,
            64
          ),
        },
      ]);
    } else {
      // For other chapters, create rows with 3 buttons
      row.push({
        text: chp.chapterNumber,
        callback_data: ("chP/" + decodeURIComponent(chp.link) + "|" + chp.chapterNumber).slice(
          0,
          64
        ),
      });
      counter++;

      if (counter === 3) {
        // When 3 buttons are added to a row, push it to the inline_keyboard
        inline_keyboard.push(row);
        row = [];
        counter = 0;
      }
    }
  }); // Push the last row (if it has fewer than 3 buttons)

  if (row.length > 0) {
    inline_keyboard.push(row);
  } // Add pagination controls as a separate row

  const navigation = [];
  if (page > 1) {
    navigation.push({
      text: "⬅️ Previous",
      callback_data: `chpPage/${page - 1}`,
    });
  }
  if (page < totalPages) {
    navigation.push({ text: "Next ➡️", callback_data: `chpPage/${page + 1}` });
  }
  if (navigation.length > 0) {
    inline_keyboard.push(navigation); // Add navigation buttons as a separate row
  }

  return inline_keyboard;
};

// Matches "/search [manga name]"
bot.onText(/\/search (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const mangaName = match[1];
  const mangaInfo = await getSpecificMangaInfo(mangaName);

  if (!mangaInfo[0].mangaCover && mangaInfo[0].chapters.length === 0) {
    bot.sendMessage(
      chatId,
      "No Results Found.\n\nEither there are no results or You Typed a wrong manga name. \n\nIt's Case sensitive so try to modify the name and if the problem persists then THERE ARE NO RESULTS."
    );
  } else {
    const inline_keyboard = paginateChapters(mangaInfo[0].chapters, 1);

    bot.sendPhoto(chatId, mangaInfo[0].mangaCover, {
      caption: mangaName.toUpperCase(),
      reply_markup: {
        inline_keyboard: inline_keyboard,
      },
    });
  }
});

// Handle callback queries for pagination and chapter selection
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;

  if (query.data.startsWith("chpPage/")) {
    const page = parseInt(query.data.split("/")[1], 10); // Fetch manga info again for simplicity

    const mangaName = query.message.caption.toLowerCase(); // Get the manga name from caption
    const mangaInfo = await getSpecificMangaInfo(mangaName);

    const inline_keyboard = paginateChapters(mangaInfo[0].chapters, page);

    bot.editMessageReplyMarkup(
      { inline_keyboard: inline_keyboard },
      { chat_id: chatId, message_id: messageId }
    );
  } else if (query.data.startsWith("chP/")) {
    // Extract chapter link and chapter number
    const data = query.data.split("P/");
    console.log(data);

    const chapterLink = data[1].split("|")[0];
    const chapterNumber = data[1].split("|")[1];
  
  

    console.log(data, chapterLink, chapterNumber);


    try {
      // Fetch chapter images
      const imgs = await getChapterPages(chapterLink);

      // Indicate that the bot is preparing to send a document (i.e., "upload_document" status)
      await bot.sendChatAction(chatId, "upload_document");

      // Create PDF from images
      await createPDFWithImages(
        imgs,
        `${query.message.caption} - chapter ${chapterNumber.split(" ")[0]}.pdf`
      );

      // Send the PDF file
      await bot.sendDocument(
        chatId,
        path.resolve(
          __dirname,
          `${query.message.caption} - chapter ${chapterNumber}.pdf`
        ),
        {
          caption: `${query.message.caption} - chapter ${chapterNumber} got downloaded successfully.`,
        }
      );

      // Delete the PDF file after it's sent to avoid storing unnecessary files
      fs.unlinkSync(
        path.resolve(
          __dirname,
          `${query.message.caption} - chapter ${chapterNumber}.pdf`
        )
      );
    } catch (error) {
      console.error("An error occurred:", error);
      // Optionally, you can send a message to the user indicating that something went wrong.
      await bot.sendMessage(
        chatId,
        "Oops! Something went wrong while downloading the chapter."
      );
    }
  }
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name;
  const startMessage = `Hello ${userName}! 👋 Welcome to MangaPDF Bot.

🔍 To download manga chapters as PDF:
    1. Use the /search command
    2. Type the manga name
    3. Select the chapter you want

Example: /search One Punch Man --> There will be chapters to choose from --> choose one chapter

📚 The bot will then send you the selected chapter as a PDF file.`;

  bot.sendMessage(chatId, startMessage);
});
