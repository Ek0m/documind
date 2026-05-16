# DocuMind AI Suite 🧠

**The Flagship Implementation of SettleSettle SDK Integration.**

DocuMind is a premium, open-source AI document toolkit built with Next.js 15+, Tailwind CSS 4, and the [SettleSettle SDK](https://settlesettle.vercel.app). It serves as a reference architecture for developers looking to implement usage-based billing, multi-rail payments (Paystack + Solana), and ad-reward monetization in their SaaS products.

---

## ✨ Features

- **AI Document Summarization**: Instantly condense complex documents (powered by mocked LLM).
- **Intelligent Prompt Generation**: Creative document drafting and refinement.
- **SettleSettle Core Integration**:
    - **One-Round-Trip Hydration**: Using `bootstrap()` to load entire wallet states and credit packages in a single request.
    - **Zero-Config User Sync**: Automated profile provisioning and synchronization.
    - **Dual-Rail Checkout**: Secure top-ups via **Paystack (Fiat)** and **Solana (USDC)** with real-time verification.
    - **Ad-Reward Monetization**: Integrated Ad-Network for users to earn credits by watching premium ads.
    - **Async Metering**: Event buffering for high-performance, non-blocking credit deductions.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Monetization**: [SettleSettle SDK v0.1.0+](https://settlesettle.vercel.app)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: Framer Motion & CSS Micro-animations

---

## 🚀 Getting Started

### 1. Prerequisites

- A [SettleSettle Developer Account](https://settlesettle.vercel.app)
- A SettleSettle App API Key
- Node.js 18+

### 2. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# SettleSettle Integration
SETTLESETTLE_API_KEY=your_api_key_here


# Frontend configuration
NEXT_PUBLIC_TEST_USER_ID=demo-user-123
```

### 3. Installation

```bash
npm install
npm run dev
```

---

## 📖 Key Integration Patterns

### Initialize the SDK
Configure the SDK once in a centralized library to enable global usage across API routes.

```typescript
// lib/settle.ts
import { SettleSettle } from 'settlesettle';

export const settle = new SettleSettle({
  apiKey: process.env.SETTLESETTLE_API_KEY,
  eventBuffering: {
    enabled: true,
    maxBatchSize: 20,
    flushIntervalMs: 3000,
  }
});
```

### Metering an AI Action
Deduct credits asynchronously while ensuring low-latency responses for your users.

```typescript
// app/api/settle/summarize/route.ts
const result = await settle.billing.recordAction({
  userId: userId,
  eventType: 'document_summarize'
});
```

### Handling Redirection & Success
DocuMind implements advanced `callbackUrl` logic to return users safely to the app after a Paystack or Solana checkout session.

```typescript
// app/api/settle/topup/route.ts
const { checkoutUrl } = await settle.payments.initialize({
  endUserId: userId,
  amountKobo: pkg.priceKobo,
  callbackUrl: `${req.nextUrl.origin}/?success=true`,
  provider: 'paystack'
});
```

---

## 🤝 Contributing

This project is a community resource. If you find a bug or have a suggestion for better integration patterns, please open an issue or submit a PR.

---

<p align="center">
  Built with ❤️ by the <a href="https://settlesettle.vercel.app">SettleSettle Team</a>
</p>
