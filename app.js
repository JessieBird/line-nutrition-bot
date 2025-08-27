import express from 'express';
import { config } from 'dotenv';
import { middleware, Client } from '@line/bot-sdk';
import { OpenAI } from 'openai';

config();

const app = express();
const port = process.env.PORT || 3000;

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const lineClient = new Client(lineConfig);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 新增根路由
app.get('/', (req, res) => {
  res.json({
    message: 'LINE Nutrition Bot is running!',
    status: 'online'
  });
});

// 新增健康檢查路由  
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'nutrition-bot'
  });
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
  const { food, weight } = extractFoodAndWeight(userInput);

  if (!food) {
    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '⚠️ 請輸入「重量 + 食物名稱」，例如「150g 雞胸肉」',
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: `請告訴我「${food}」每 100 克的營養成分，格式如下，不要加說明：

熱量：約 xxx 大卡 / 100g  
蛋白質：約 xxx g  
脂肪：約 xxx g  
碳水化合物：約 xxx g`,
        },
      ],
    });

    const aiText = completion.choices[0].message.content.trim();
    const parsed = parseNutritionFromAI(aiText);

    if (!parsed) {
      return lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: '⚠️ 無法解析營養資訊，請稍後再試或更換食物名稱。',
      });
    }

    const multiplier = weight / 100;
    const replyText = `食物：${food}
重量：${weight}g
熱量：約 ${Math.round(parsed.calories * multiplier)} 大卡
蛋白質：約 ${(parsed.protein * multiplier).toFixed(1)}g
脂肪：約 ${(parsed.fat * multiplier).toFixed(1)}g
碳水化合物：約 ${(parsed.carbs * multiplier).toFixed(1)}g`;

    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: replyText,
    });
  } catch (error) {
    console.error('🔴 ChatGPT 回覆錯誤：', error.status, error.message);
    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '❌ 抱歉，我暫時無法取得資料，請稍後再試！',
    });
  }
}

// 萃取重量與食物名稱，例如「150g 雞胸肉」
function extractFoodAndWeight(input) {
  const match = input.match(/(\d+)\s*(g|公克)?\s*(.+)/i);
  if (match) {
    const weight = parseInt(match[1]);
    const food = match[3].trim();
    return { weight, food };
  } else {
    return { weight: 100, food: input.trim() }; // 預設當作 100g
  }
}

// 解析 GPT 回覆內容
function parseNutritionFromAI(text) {
  try {
    const cal = parseFloat(text.match(/熱量：約\s*([\d.]+)/)?.[1] || 0);
    const protein = parseFloat(text.match(/蛋白質：約\s*([\d.]+)/)?.[1] || 0);
    const fat = parseFloat(text.match(/脂肪：約\s*([\d.]+)/)?.[1] || 0);
    const carbs = parseFloat(text.match(/碳水化合物：約\s*([\d.]+)/)?.[1] || 0);
    return { calories: cal, protein, fat, carbs };
  } catch {
    return null;
  }
}

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
