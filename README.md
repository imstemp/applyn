# applyn - Desktop App

A standalone Electron desktop application for job seekers, featuring AI-powered resume generation, cover letter creation, interview preparation, and skills analysis.

## Features

- **Profile Management**: Store your work history, skills, and education
- **Resume Generator**: Generate multiple resumes tailored to specific job types using AI
- **Cover Letter Generator**: Create personalized cover letters based on your resume
- **Interview Prep**: Get tailored interview questions and practice your answers
- **Skills Highlighter**: Analyze how your skills match job descriptions and get optimization suggestions
- **Word Export**: Download resumes as Word documents (.docx)

## Tech Stack

- **Framework**: Electron + React (Vite)
- **Frontend**: React, TypeScript, Tailwind CSS
- **Database**: SQLite with Prisma ORM
- **AI**: Claude API (user provides their own API key)
- **Build**: Electron Builder

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Claude API key (get one from [Anthropic Console](https://console.anthropic.com/settings/keys))

### Installation

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
```bash
npm run db:generate
```

3. Set up the database:
```bash
npm run db:push
```

4. Run in development mode:
```bash
npm run electron:dev
```

This will start Vite dev server and Electron app.

### Configuration

1. Open the app
2. On first launch, enter your **Gumroad license key** (from your purchase)
3. In Settings, enter your **Claude API key** (BYOK)
4. Both are stored locally on your device

## Selling with Gumroad ($29 + BYOK)

The app uses [Gumroad](https://gumroad.com) for license keys. To sell the app:

1. **Create a product** on Gumroad (e.g. $29 one-time). Enable **License keys** in the product settings.
2. **Set your Gumroad product ID**  
   - In `electron/gumroad.ts`, set `GUMROAD_PRODUCT_ID` to your product ID (from the product URL or Gumroad dashboard), or set the `GUMROAD_PRODUCT_ID` environment variable when building.
3. **Set the buy link**  
   - In `src/pages/Activate.tsx`, set `GUMROAD_BUY_URL` to your Gumroad product URL (e.g. `https://gumroad.com/l/yourapp`).

In development, if `GUMROAD_PRODUCT_ID` is not set, license verification is bypassed so you can run the app without a key.

## Building for Production

Build for your current platform:
```bash
npm run electron:build
```

The built application will be in the `dist-electron` directory.

## Project Structure

```
jht/
├── electron/              # Electron main process
│   ├── main.ts           # Main Electron process
│   ├── preload.ts        # Preload script (security bridge)
│   ├── ipc-handlers.ts   # IPC handlers for API calls
│   ├── config.ts         # Configuration management
│   └── resume-generator.ts # Resume generation logic
├── src/                   # React frontend
│   ├── components/       # React components
│   ├── pages/           # Page components
│   ├── lib/             # Utilities
│   └── types/           # TypeScript types
├── prisma/              # Database schema
└── public/              # Static assets
```

## Data Storage

All data is stored locally on your device:
- Database: `{userData}/database.db` (SQLite)
- Config: `{userData}/config.json` (encrypted API key)

The `userData` directory location:
- **macOS**: `~/Library/Application Support/applyn`
- **Windows**: `%APPDATA%/applyn`
- **Linux**: `~/.config/applyn`

## Development

- `npm run dev` - Start Vite dev server only
- `npm run electron:dev` - Start both Vite and Electron
- `npm run build` - Build React app
- `npm run electron:build` - Build and package Electron app

## License

MIT



