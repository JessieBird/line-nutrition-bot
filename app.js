import express from 'express';
import { config } from 'dotenv';
import { middleware, Client } from '@line/bot-sdk';
import { OpenAI } from 'openai';

config();

const app = express();
const port = process.env.PORT || 3000;

// LINE SDK 設定
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const lineClient = new Client(lineConfig);

// OpenAI 設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(middleware(lineConfig));
app.use(express.json());

app.post('/callback', async (req, res) => {
  try {
    const events = req.body.events;
    const results = await Promise.all(events.map(handleEvent));
    res.status(200).json(results);
  } catch (err) {
    console.error('❌ Webhook 錯誤:', err);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userInput = event.message.text;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: `
你是一個營養師，根據以下輸入的食物名稱與公克數，請換算出營養資訊。
回覆格式如下，且必須使用繁體中文、不要多加說明，也不要省略任何欄位：

食物：xxx  
重量：xxx g  
熱量：約 xxx 大卡  
蛋白質：約 xxx g  
脂肪：約 xxx g  
碳水化合物：約 xxx g

使用100g的資料作為基準，再根據輸入的重量（若有）進行簡單換算。
使用者輸入：「${userInput}」`,
        },
      ],
      max_tokens: 180,
      temperature: 0.2,
    });

    const aiReply = completion.choices[0].message.content.trim();

    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: aiReply,
    });
  } catch (error) {
    console.error('🔴 ChatGPT 回覆錯誤：', error.status, error.message);
    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ 抱歉，我暫時無法取得資料，請稍後再試！',
    });
  }
}

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
