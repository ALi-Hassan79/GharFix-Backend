# GharFix Backend — Supabase Edition

Express.js REST API for the GharFix home services marketplace, migrated from MongoDB/Mongoose to **Supabase (PostgreSQL)**.

---

## 🚀 Setup

### 1. Create a Supabase project
Go to [app.supabase.com](https://app.supabase.com) → New Project → note your **Project URL** and **service_role** key.

### 2. Run the database schema
In your Supabase dashboard → **SQL Editor**, paste and run the contents of `db/schema.sql`. This creates all tables, indexes, and triggers (including auto-rating recalculation).

### 3. Add a helper RPC function
Also run this in the SQL Editor (used by the booking controller):
```sql
CREATE OR REPLACE FUNCTION increment_provider_jobs(provider_id UUID)
RETURNS VOID AS $$
  UPDATE providers SET total_jobs = total_jobs + 1 WHERE id = provider_id;
$$ LANGUAGE SQL;
```

### 4. Configure environment variables
```bash
cp .env.example .env
```
Fill in:
- `SUPABASE_URL` — your project URL
- `SUPABASE_SERVICE_KEY` — your `service_role` secret key
- `JWT_SECRET` — any long random string

### 5. Install dependencies & run
```bash
npm install
npm run dev   # development (nodemon)
npm start     # production
```

---

## 📁 Project Structure

```
gharfix-backend/
├── config/
│   ├── supabase.js       # Supabase client
│   └── jwt.js            # JWT helpers
├── controllers/
│   ├── auth.controller.js
│   ├── booking.controller.js
│   ├── provider.controller.js
│   └── review.controller.js
├── db/
│   └── schema.sql        # ← Run this in Supabase SQL Editor first!
├── middleware/
│   └── auth.middleware.js
├── routes/
│   ├── auth.routes.js
│   ├── booking.routes.js
│   ├── provider.routes.js
│   ├── review.routes.js
│   ├── service.routes.js
│   └── user.routes.js
├── .env.example
├── server.js
└── package.json
```

---

## 🔄 Key Changes from MongoDB

| MongoDB/Mongoose       | Supabase/PostgreSQL           |
|------------------------|-------------------------------|
| `mongoose.connect()`   | `createClient()` from `@supabase/supabase-js` |
| Mongoose models/schemas | PostgreSQL tables in `schema.sql` |
| `Model.find(filter)`   | `supabase.from('table').select().eq()` |
| `Model.create(data)`   | `supabase.from('table').insert(data)` |
| `Model.findByIdAndUpdate()` | `supabase.from('table').update().eq('id', ...)` |
| Mongoose `.populate()` | Supabase nested selects: `user:users(id, name)` |
| `post('save')` hook for rating | PostgreSQL trigger in `schema.sql` |
| `_id` (ObjectId)       | `id` (UUID)                   |
| camelCase field names  | snake_case field names        |

---

## 📡 API Endpoints

Same as original — all routes unchanged:

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register customer or provider |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | ✅ | Get current user |
| POST | `/api/auth/change-password` | ✅ | Change password |
| GET | `/api/providers` | — | List providers (filterable) |
| GET | `/api/providers/:id` | — | Single provider |
| PUT | `/api/providers/:id` | ✅ | Update provider profile |
| POST | `/api/bookings` | ✅ | Create booking |
| GET | `/api/bookings/my` | ✅ | Get my bookings |
| PATCH | `/api/bookings/:id/status` | ✅ | Update booking status |
| POST | `/api/reviews` | ✅ | Submit review |
| GET | `/api/reviews/provider/:id` | — | Get provider reviews |
| GET | `/api/services` | — | List service categories |
| GET | `/api/users/profile` | ✅ | Get user profile |
| PUT | `/api/users/profile` | ✅ | Update user profile |
