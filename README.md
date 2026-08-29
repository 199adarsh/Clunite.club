<div align="center">

# 🎓 Clunite

**Campus Event & Club Management Platform**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

[Features](#-features) • [Demo](#-demo) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📖 About

**Clunite** is a campus event and club management platform that helps students discover events and clubs while empowering organizers with powerful management tools. Built with modern web technologies like Next.js, TypeScript, and Supabase.

### Key Features

- **Dual Dashboard System** - Separate interfaces for students and organizers
- **Event Discovery & Registration** - Browse, filter, and register for campus events
- **Club Management** - Create, manage, and verify clubs with secure PIN authentication
- **Real-time Updates** - Live data powered by Supabase
- **Analytics Dashboard** - Comprehensive insights for event organizers
- **Modern Responsive Design** - Beautiful UI built with shadcn/ui and Tailwind CSS
- **Type-Safe Codebase** - Full TypeScript support with form validation

---

## 🧰 Tech Stack

**Frontend:** Next.js 14 • React 18 • TypeScript • Tailwind CSS • shadcn/ui  
**Backend:** Next.js API Routes • Supabase  
**Database:** PostgreSQL  
**Storage:** Vercel Blob  
**Tools:** React Hook Form • Zod • Vercel Analytics

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **npm** / **pnpm** / **yarn**
- **Supabase** account and project
- **Vercel** account (for deployment and Blob storage)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/clunite.git
   cd clunite
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   ```

3. **Set up environment variables**

   Create `.env.local` with your credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   BLOB_READ_WRITE_TOKEN=your_blob_token
   RESEND_API_KEY=your_resend_key
   ```

4. **Set up the database**

   Run these SQL scripts in your Supabase SQL editor (in order):
   - `scripts/init-database-v2.sql`
   - `scripts/functions.sql`
   - `scripts/rls-policies.sql`
   - `scripts/seed-data-v2.sql` (optional demo data)

5. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser

---

## 🚢 Deployment

Deploy to Vercel in 3 steps:

1. Push your code to GitHub
2. Import your repository on [vercel.com](https://vercel.com)
3. Add environment variables and deploy

For detailed instructions, see [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

## 📚 Documentation

- [Setup Guide](./docs/SETUP.md)
- [Database Guide](./docs/DATABASE.md)
- [API Documentation](./docs/API.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

For bug reports or feature requests, use [GitHub Issues](https://github.com/yourusername/clunite/issues)

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details
