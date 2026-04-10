# Whisper: Decentralized Confessions

Whisper is a decentralized confession platform built on **Solana** and **Arweave (Irys)**. Users can post anonymous secrets to the blockchain in a truly censorship-resistant social feed.

![architecture](image.png)

## 🚀 Quick Start (Setup Guide)

Follow these steps to get the project running locally for **FOSS Weekend**.

### 1. Program Setup (Rust/Solana)
Build the Solana program to generate the IDL and types:
```bash
cd whisper
anchor build
```

### 2. Frontend Setup (Next.js)
Install dependencies and launch the development server:
```bash
cd frontend
npm install
npm run dev
```

---

## 🏗️ Architecture
- **Solana (Anchor)**: Manages metadata, PDA derived addresses, and reaction counts.
- **Arweave (Irys)**: Permanent storage for the encrypted or raw confession text.
- **Next.js**: Premium UI for secret discovery and interaction.

## 📝 Roadmap & Tasks
Specific tasks for contributors are tagged with `[FOSS ISSUE]` directly in the source code. 
- **Rust Tasks**: `whisper/programs/whisper/src/lib.rs` (3 Issues)
- **Frontend Tasks**: Search for the tags in the `/frontend` components (6 Issues)

## 🤝 Contribution
Please refer to [CONTRIBUTING.md](./CONTRIBUTING.md) for the workflow before submitting your first PR.

---
*Whisper your secrets to the blockchain.*
