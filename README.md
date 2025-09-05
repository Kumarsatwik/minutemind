# Meeting Bot

An AI-powered meeting assistant that automatically generates summaries, action items, and intelligent insights for your meetings. Never miss important details again.

## Features

- 🤖 **AI-Powered Summaries**: Automatic meeting transcripts and summaries
- 📋 **Action Items Extraction**: Intelligent identification of tasks and follow-ups
- 📅 **Calendar Integration**: Sync with Google Calendar for seamless scheduling
- 💬 **Slack Integration**: Connect your Slack workspace for notifications
- 🔐 **Secure Authentication**: Powered by Clerk for user management
- 🎨 **Modern UI**: Built with Next.js, Tailwind CSS, and Radix UI components

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Authentication**: Clerk
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Clerk account for authentication

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Kumarsatwik/minutemind.git
cd minutemind/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with the following variables:
```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
# Add other required environment variables
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
frontend/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   └── page.tsx          # Main landing page
├── components/            # Shared components
├── lib/                   # Utility functions
├── prisma/               # Database schema
└── public/               # Static assets
```

## Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For support, please contact the development team or create an issue in the repository.
