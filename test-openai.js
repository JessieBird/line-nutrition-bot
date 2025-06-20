import { config } from 'dotenv';
import { OpenAI } from 'openai';

config(); // 讀取 .env 檔案

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const runTest = async () => {
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'user', content: '請問牛肉的熱量是多少？' },
            ],
        });

        console.log('✅ 測試成功：');
        console.log(completion.choices[0].message.content);
    } catch (err) {
        console.error('❌ 測試失敗：');
        console.error(err);
    }
};

runTest();
