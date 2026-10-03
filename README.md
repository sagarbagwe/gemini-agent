# Gemini Agent

A small Gemini-powered conversational AI application built with Next.js, TypeScript, Tailwind CSS, Prisma, and SQLite.

## Features

- Streaming Gemini responses through a server-side API
- Persistent conversations and messages with SQLite + Prisma
- Create, rename, delete, and switch between conversations
- Markdown and GitHub-flavored Markdown rendering
- Copy assistant responses
- Stop generation with the stop button or `Escape`
- Light/dark mode and responsive mobile sidebar
- Gemini API keys remain server-side

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example` and add your Gemini key:

   ```env
   GEMINI_API_KEY=your_api_key_here
   DATABASE_URL="file:./dev.db"
   ```

3. Create the local database:

   ```bash
   npm run db:push
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Useful commands

```bash
npm run lint
npm run build
npm run db:generate
```

The chat endpoint is `POST /api/chat` and accepts `{ "conversationId": "...", "message": "..." }`.
