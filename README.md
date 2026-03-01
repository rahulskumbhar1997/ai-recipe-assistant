# AI Recipe Assistant

AI Recipe Assistant is a full-stack application that helps users:
- Upload or capture a food image and get dish suggestions.
- Chat with an AI chef for recipe-related questions.

The project contains:
- **Backend**: Flask + LangChain agents (OpenAI + Tavily tool)
- **Frontend**: Angular 21 app

## Project Structure

```text
receipe_app/
├── backend/
│   ├── app.py
│   ├── chat_bot.py
│   ├── process_image.py
│   ├── web_search.py
│   ├── exceptions.py
│   └── requirements.txt
└── frontend/
    ├── src/app/
    ├── package.json
    └── angular.json
```

## Features

- Image upload (`.png`, `.jpg`, `.jpeg`) and ingredient detection via multimodal model.
- Dish recommendations generated from detected ingredients.
- AI chat endpoint restricted by prompt to cooking/recipe/food topics.
- Camera capture support in frontend (browser permission required).
- Basic rate-limit handling from OpenAI API (HTTP `429`).

## Tech Stack

### Backend
- Python
- Flask, Flask-CORS
- LangChain (`langchain`, `langchain_openai`)
- OpenAI SDK
- Tavily API client

### Frontend
- Angular 21
- TypeScript
- Angular HttpClient + Forms

## Prerequisites

- Python `3.10+`
- Node.js `^20.19.0` or `^22.12.0` (Angular 21 requirement)
- OpenAI API key
- Tavily API key

## Environment Variables

Set these before running the backend:

- `OPENAI_API_KEY` – required by LangChain/OpenAI models
- `TAVILY_API_KEY` – required for web search tool

Example (macOS/Linux):

```bash
export OPENAI_API_KEY="your_openai_key"
export TAVILY_API_KEY="your_tavily_key"
```

## Run the Backend

From the project root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Backend runs on: `http://localhost:8080`

## Run the Frontend

In another terminal:

```bash
cd frontend
npm install
npm start
```

Frontend runs on: `http://localhost:4200`

> Backend base URL is configured in `frontend/src/app/backend.config.ts` (default: `http://localhost:8080`).

## API Endpoints

### `GET /`
Health-style test route.

Response:
- `Hello, World!`

### `POST /upload-image`
Upload an image as `multipart/form-data` with key `image`.

Success response (`200`):

```json
{
  "message": "...dishes list...",
  "filename": "example.jpg"
}
```

Validation errors (`400`):
- Missing file part
- Empty filename
- Unsupported extension

Rate limit (`429`):

```json
{
  "error": "rate_limited",
  "message": "OpenAI rate limit exceeded. Please retry after some time.",
  "details": {
    "source": "image_contents_invoke | recipe_invoke",
    "status_code": 429,
    "type": "rate_limit_error",
    "retry_after": "..."
  }
}
```

### `POST /chat`
JSON body:

```json
{
  "message": "Suggest a quick paneer recipe"
}
```

Success response (`200`):

```json
{
  "message": "...assistant response..."
}
```

Validation error (`400`):
- Missing `message`

Rate limit (`429`): same shape as above.

## How the App Works

1. User uploads/captures an image in Angular UI.
2. Frontend sends image to `/upload-image`.
3. Backend detects food items from image.
4. Backend queries dish ideas with a tool-enabled agent (`web_search`).
5. Result is returned and rendered in UI.
6. User can continue asking recipe questions in chat via `/chat`.

## Notes

- Current CORS setup allows local origins (`localhost` / `127.0.0.1`).
- Frontend displays assistant HTML content via `innerHTML`; only trusted backend output should be rendered.
- Model configured in backend is `gpt-5-nano`.

## Troubleshooting

- **429 Too Many Requests**: wait and retry; verify API quota/limits.
- **`ERR_REQUIRE_ESM` from Vite**: your Node version is too old for Angular 21 + Vite 7. Use Node `22.12+` (or `20.19+`), then reinstall dependencies:

  ```bash
  cd frontend
  nvm use
  rm -rf node_modules package-lock.json
  npm install
  npm start
  ```
- **CORS errors**: ensure frontend is running on local host and backend on port `8080`.
- **API auth errors**: verify `OPENAI_API_KEY` and `TAVILY_API_KEY` are set in the same terminal session where backend is started.
- **Camera unavailable**: allow browser camera permissions and use HTTPS or localhost.

## Future Improvements

- Add `.env` support (e.g., `python-dotenv`) for simpler local setup.
- Add backend and frontend test coverage.
- Add Docker and docker-compose for one-command startup.
