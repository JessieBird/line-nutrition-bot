import express from 'express';
import { config } from 'dotenv';
import { middleware, Client } from '@line/bot-sdk';
import { OpenAI } from 'openai';

config();

const app = express();
const port = process.env.PORT || 3000;

// 設定 LINE SDK
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const lineClient = new Client(lineConfig);

// 設定 OpenAI SDK
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/callback', middleware(lineConfig), async (req, res) => {
  try {
    const events = req.body.events;
    const results = await Promise.all(events.map(handleEvent));
    res.status(200).json(results);
  } catch (err) {
    console.error('❌ Webhook 處理錯誤:', err);
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
          content: `請你根據「${userInput}」這種食物，回覆格式如下，不要多加說明：

食物：xxx  
熱量：約 xxx 大卡 / 100g  
蛋白質：約 xxx g  
脂肪：約 xxx g  
碳水化合物：約 xxx g`,
        },
      ],
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
