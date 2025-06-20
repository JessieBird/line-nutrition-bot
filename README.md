# Line Nutrition Bot

This is a LINE bot that returns the nutrition facts (calories, protein, fat, carbs) of a food based on user input.

## Features

- Accepts food names via LINE messages
- Uses OpenAI API to return concise nutritional information
- Can be deployed to cloud platforms (e.g., Render)

## Setup Instructions

### 1. Install dependencies

```bash
npm install

2. Environment Variables
Create a .env file and add the following variables:

LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
OPENAI_API_KEY=your_openai_api_key
PORT=3000

3. Run the app

node app.js

Webhook URL
Set your webhook to:
https://your.render.url/callback

Optional (for testing)
You can test OpenAI response locally with:
node test-openai.js