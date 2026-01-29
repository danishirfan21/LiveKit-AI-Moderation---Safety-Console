# LiveKit AI Moderation & Safety Console

An internal admin console for AI-driven moderation of LiveKit rooms with real-time event processing, LangGraph-based moderation pipeline, and auditable decision logging.

## Features

- **Real-time Room Monitoring**: View active LiveKit rooms and participant activity
- **AI-Powered Moderation**: LangGraph pipeline for content classification and scoring
- **Configurable Policies**: Adjustable thresholds for different content categories
- **Audit Logging**: Complete trail of all moderation decisions and actions
- **WebSocket Updates**: Live updates as events occur

## Architecture

```
├── frontend/          # Next.js 14 application
│   ├── src/
│   │   ├── app/       # App Router pages
│   │   ├── components/# React components
│   │   ├── store/     # Redux Toolkit store
│   │   ├── hooks/     # Custom hooks (WebSocket)
│   │   ├── types/     # TypeScript interfaces
│   │   └── lib/       # API utilities
│
├── backend/           # Python FastAPI application
│   ├── app/
│   │   ├── api/       # REST & WebSocket endpoints
│   │   ├── core/      # Configuration & storage
│   │   ├── models/    # Pydantic models
│   │   └── moderation/# LangGraph pipeline
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- OpenAI API key (for content moderation)

## Quick Start

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:3000 to view the console.

## Troubleshooting

### Windows Path Issues (Ampersand & Spaces)

If you encounter an error like `'Safety' is not recognized as an internal or external command` when running `npm run dev` on Windows, it is likely due to the ampersand (`&`) or spaces in your project directory path (e.g., `D:\LiveKit AI Moderation & Safety Console`).

**Solution:** Rename the project directory to something without special characters or spaces, such as `livekit-moderation-console`, and try running the command again.

## Configuration

### Environment Variables (Backend)

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for moderation | Required |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4o-mini` |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `DEBUG` | Enable debug mode | `true` |

### Policy Categories

The system supports 5 policy categories:

1. **Harassment**: Content that harasses, intimidates, or bullies
2. **Hate Speech**: Content promoting hatred against protected groups
3. **Spam**: Repetitive, promotional, or unsolicited content
4. **Violence**: Content promoting or glorifying violence
5. **Adult Content**: Sexually explicit or mature content

Each policy has configurable thresholds for:
- **Warn**: Send warning to participant
- **Mute**: Temporarily mute the participant
- **Flag for Review**: Add to review queue for human review

## API Endpoints

### Webhooks
- `POST /api/webhooks/livekit` - LiveKit event ingestion
- `POST /api/webhooks/simulate` - Simulate content for testing

### Rooms
- `GET /api/rooms` - List rooms
- `GET /api/rooms/{id}` - Get room details
- `GET /api/rooms/{id}/participants` - Get room participants
- `GET /api/rooms/stats` - Get room statistics

### Moderation
- `GET /api/moderation/decisions` - List decisions
- `GET /api/moderation/decisions/{id}` - Get decision details
- `GET /api/moderation/decisions/stats` - Get statistics
- `POST /api/moderation/decisions/{id}/review` - Review a decision
- `POST /api/moderation/decisions/{id}/overturn` - Overturn a decision

### Policies
- `GET /api/policies` - List policies
- `GET /api/policies/{id}` - Get policy details
- `PUT /api/policies/{id}` - Update policy thresholds
- `POST /api/policies/{id}/toggle` - Toggle policy enabled state

### Audit
- `GET /api/audit` - List audit logs
- `GET /api/audit/stats` - Get statistics
- `GET /api/audit/export` - Export logs (JSON/CSV)

### WebSocket
- `WS /ws` - Real-time updates

## Testing the Moderation Pipeline

Use the simulation endpoint to test moderation without LiveKit:

```bash
curl -X POST http://localhost:8000/api/webhooks/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "test-room-001",
    "participant_id": "user-001",
    "participant_identity": "testuser",
    "content": "Your test content here"
  }'
```

## Moderation Pipeline

The LangGraph pipeline follows this flow:

```
[Content] → [Classify] → [Score] → [Decide] → [Action]
```

1. **Classify**: LLM determines policy category
2. **Score**: LLM assigns confidence score (0-1)
3. **Decide**: Deterministic threshold comparison
4. **Action**: Execute and log the action

All decisions are logged before actions are executed for auditability.

## Technology Stack

### Backend
- FastAPI
- Pydantic
- LangChain
- LangGraph
- WebSockets

### Frontend
- Next.js 14 (App Router)
- React 18
- Redux Toolkit
- Tailwind CSS
- TypeScript

## Notes

- **No Authentication**: All endpoints are open (designed for internal use)
- **In-Memory Storage**: Data resets on restart
- **OpenAI Required**: The moderation pipeline requires an OpenAI API key

## License

Internal use only.
