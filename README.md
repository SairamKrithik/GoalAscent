# GoalAscent 🚀

GoalAscent is a comprehensive goal-tracking, habit-building, and contest management platform built natively for both Web and Android. It helps users track their ambitions, measure progress iteratively, and build discipline through visually pleasing metrics.

The platform is designed with a **True Universal App** architecture: A unified Next.js codebase that dynamically compiles for the web and runs as an Android App via Capacitor.

## 🛠️ Tech Stack

* **Framework:** [Next.js 16 (App Router)](https://nextjs.org/)
* **Mobile Bridge:** [Capacitor JS](https://capacitorjs.com/) for Android packaging capabilities
* **UI & Styling:** [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), Framer Motion
* **Database & Auth:** [Supabase](https://supabase.com/) & Supabase SSR
* **State Management:** [Zustand](https://zustand-demo.pmnd.rs/), [React Query](https://tanstack.com/query/latest)
* **Drag & Drop:** [@dnd-kit](https://dndkit.com/)
* **Data Visualization:** [Recharts](https://recharts.org/)
* **Forms & Validation:** React Hook Form + Zod

## ⚙️ Getting Started

### Prerequisites
* Node.js >= 20.x
* Android Studio (if developing for Android natively)
* A [Supabase](https://supabase.com/) project

### 1. Installation

```bash
git clone https://github.com/SairamKrithik/GoalAscent.git
cd GoalAscent
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Running for Web (Development)

Start the Next.js development server:

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Running for Android (Local Emulator)

To run the app inside Android Studio via Capacitor targeting your local development environment:

1. Ensure `npm run dev` is running.
2. In `capacitor.config.ts`, ensure `server.url` points to `http://10.0.2.2:3000` (for emulator) or your local Wi-Fi IP (for a physical device on the same network).
3. Open the Android project in Android Studio:
```bash
npx cap open android
```
4. Click the 'Play' button in Android Studio to build and deploy to your emulator or physical device.

## 📱 Production Build Prep

### For Web
Standard Next.js deployment (ideal for Vercel):
```bash
npm run build
npm start
```

### For Android APK / Play Store
Once your web app is hosted (e.g. `https://goalascent.app`):
1. Update `capacitor.config.ts`: Set `server.url` to your production URL. Remove `cleartext: true`.
2. Sync Capacitor: `npx cap sync android`
3. Generate your Signed APK or App Bundle inside Android Studio.

## 📂 Project Architecture

* `app/` - Next.js 16 App Router (Core UI, Server Components, API routes, layout)
* `android/` - Capacitor Android shell (Generated via `npx cap add android`)
* `components/` - Reusable UI widgets and Shadcn components
* `lib/` - Supabase clients, reusable queries, utilities, and Zustand state
* `supabase/` - Database schemas and potential migrations
* `public/` - Static assets and fonts

## 📜 License
Private and Confidential. (Update if making open source)
