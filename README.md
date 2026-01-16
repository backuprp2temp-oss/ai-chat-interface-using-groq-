# AI Chat Interface (Groq API)

A high-performance, feature-rich AI chat interface built with **React 19**, **Vite**, and the **Groq SDK**. This application provides a seamless experience for interacting with various LLMs, featuring real-time transcription and a polished UI.

## 🚀 Features

* **Advanced Chat Interface**: Supports markdown rendering, syntax highlighting for code blocks (Mac-style terminal UI), and starter prompt cards.
* **Voice Capabilities**: Integrated voice-to-text transcription using Groq's `whisper-large-v3` model.
* **Session Management**: Local storage persistence for chat history, allowing users to create, rename, and delete multiple sessions.
* **Message Tools**: Ability to edit previous messages, regenerate assistant responses, and copy content to the clipboard.
* **Multi-Model Support**: Easily switch between supported Groq models (e.g., Kimi, Whisper, PlayAI).
* **Export Options**: Download full chat histories as text files.
* **Responsive UI**: A modern, dark-themed interface built with Tailwind CSS and Framer Motion for smooth transitions.

## 🛠️ Tech Stack

* **Frontend**: React 19, Vite.
* **Styling**: Tailwind CSS, Lucide React (icons), Framer Motion (animations).
* **AI Integration**: Groq SDK.
* **Utilities**: `react-markdown` (rendering), `prism` (syntax highlighting), `sonner` (toasts), `uuid` (session IDs).

## 📦 Getting Started

### Prerequisites

* Node.js (latest LTS recommended)
* A [Groq API Key](https://console.groq.com/)

### Installation

1. Clone the repository.
2. Install dependencies:
```bash
npm install

```


3. Start the development server:
```bash
npm run dev

```



## ⚙️ Configuration

Upon first launch, the application will prompt you to enter your **Groq API Key** via a secure modal.

* Keys are stored locally in your browser's `localStorage` and are never sent to a backend server.
* You can also configure a global **System Prompt** in the settings modal to customize AI behavior.

## 📝 Usage

* **New Chat**: Click "New Chat" in the sidebar to start a fresh conversation.
* **Voice Input**: Click the microphone icon in the input bar to record and transcribe audio directly into the message field.
* **Edit/Regenerate**: Hover over messages to see options for editing your prompts or regenerating AI responses.
* **Views**: Toggle between **Chat**, **Transcription**, and **TTS** (Text-to-Speech) modes via the main layout.
