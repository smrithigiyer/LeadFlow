# LeadFlow — Lead Management & Follow-Up System

A clean **Vite + React 18 + Tailwind CSS 3** admin panel for managing leads and follow-ups.

## Tech Stack

- **Vite 5** — fast dev server and build tool
- **React 18** — UI framework
- **Tailwind CSS 3** — utility-first styling
- **Recharts** — dashboard charts
- **React Hot Toast** — notifications
- **Axios** — HTTP client
- **date-fns** — date formatting

## Project Structure

```
src/
├── components/
│   ├── AdminLayout.jsx   # Sidebar + topbar shell
│   ├── Badges.jsx        # StatusBadge
│   ├── EmptyState.jsx    # Empty table placeholder
│   ├── Modal.jsx         # Reusable modal
│   └── StatCard.jsx      # KPI card
├── pages/
│   ├── Dashboard.jsx     # Charts + KPI overview
│   ├── FollowUps.jsx     # Follow-up CRUD
│   ├── Leads.jsx         # Lead management table
└── utils/
    └── api.js            # Axios instance + followUpApi / leadApi / statsApi
```

## Routes

| Path                   | Component      | Description                       |
|------------------------|----------------|-----------------------------------|
| `/admin/dashboard`     | Dashboard      | KPI overview + charts             |
| `/admin/leads`         | Leads          | View / manage submitted leads     |
| `/admin/followups`     | FollowUps      | Create / edit / delete follow-ups |

## API Endpoints Expected

```
GET    /api/leads              ?search=&status=
POST   /api/leads
PATCH  /api/leads/:id/status
DELETE /api/leads/:id

GET    /api/followups          ?search=&status=
POST   /api/followups
PUT    /api/followups/:id
DELETE /api/followups/:id

GET    /api/stats
```

Stats endpoint should return `{ data: { totalLeads, newLeads, followupLeads, convertedLeads } }`.

## Getting Started

```bash
npm install
cp .env.example .env   # set VITE_API_URL
npm run dev
```
