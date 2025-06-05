# Beluva Interiors - Product Requirements Document (PRD)

## Overview

**Beluva Interiors** is a single-page AI-powered web app that allows users to upload an image of their room, specify furniture preferences and a budget, and receive personalized furniture recommendations. Users get a visual representation of the room with suggested furniture and interactive purchase links. An admin dashboard allows management of the furniture database.

---

## Tech Stack

- **Frontend**: Next.js
- **Backend**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **AI Models**: OpenAI GPT-4 Vision / Image Models
- **Deployment**: Vercel

---

## Core Features & Atomic Tasks

---

### 1. User Authentication & Profile Management

- [ ] Implement email and OAuth login with Supabase Auth
- [ ] Create `users` table: id, name, email, created_at
- [ ] Allow profile updates (name, contact info)
- [ ] Session management via Supabase
- [ ] Route protection and session validation middleware

---

### 2. Room Image Upload & Management

- [ ] Configure Supabase Storage bucket: `room-uploads`
- [ ] Create image upload API endpoint:
  - Accept JPG, PNG, WEBP
  - Validate file size and format
- [ ] Create `room_images` table:
  - id, user_id, file_path, uploaded_at
- [ ] Link uploaded image to user and session

---

### 3. Furniture Database (Admin Only)

- [ ] Create `furniture_items` table:
  - id, name, description, price, dimensions, material, tags (array), image_urls, stock_status, category, purchase_link
- [ ] CRUD endpoints:
  - Create furniture
  - Read/search furniture
  - Update furniture
  - Delete furniture
- [ ] Optional `furniture_images` table for multi-image support
- [ ] Filter and search endpoint for frontend and AI use

---

### 4. AI-Powered Furniture Recommendation Engine

- [ ] Create endpoint `/api/recommend-furniture`:
  - Input: room image ID, budget, style/theme, desired furniture types
- [ ] Use GPT-4 Vision/Image model to:
  - Extract room features (style, size, palette)
  - Translate features into searchable tags
- [ ] Query `furniture_items` table for matching items
- [ ] Return:
  - Furniture ID, name, image, price, reason for match, purchase link

---

### 5. Room Visualization with AI

- [ ] Create endpoint `/api/generate-room-visual`:
  - Input: room image ID, selected furniture item IDs
- [ ] Use GPT/Image model to:
  - Generate composite image of room with selected furniture
- [ ] Store image in `generated-rooms` bucket
- [ ] Return image URL and store metadata in `user_sessions`

---

### 6. Interactive Room Viewer

- [ ] Design bounding box schema:
  - room_id, furniture_id, x, y, width, height
- [ ] Store metadata per generated image
- [ ] Create endpoint `/api/furniture-placement-metadata`
- [ ] Frontend:
  - Display interactive hover tooltips on bounding boxes
  - Show name, price, description, link

---

### 7. User Session & History Management

- [ ] Create `user_sessions` table:
  - id, user_id, uploaded_image_id, selected_furniture_ids, generated_image_url, created_at
- [ ] Store data per session:
  - Original image, preferences, AI response, selections, final visual
- [ ] Create endpoint `/api/user/history` to return sessions per user

---

### 8. Admin Dashboard

- [ ] Admin login check (via Supabase role or email list)
- [ ] Dashboard views:
  - Add/edit/delete furniture items
  - Upload images
  - Filter/search inventory
  - View user activity logs
- [ ] Optional: Room image moderation tool

---

## Supabase Tables Overview

### `users`

| Field       | Type      |
|-------------|-----------|
| id          | UUID      |
| name        | Text      |
| email       | Text      |
| created_at  | Timestamp |

### `room_images`

| Field       | Type      |
|-------------|-----------|
| id          | UUID      |
| user_id     | UUID      |
| file_path   | Text      |
| uploaded_at | Timestamp |

### `furniture_items`

| Field         | Type      |
|---------------|-----------|
| id            | UUID      |
| name          | Text      |
| description   | Text      |
| price         | Float     |
| dimensions    | Text      |
| material      | Text      |
| tags          | Text[]    |
| image_urls    | Text[]    |
| stock_status  | Boolean   |
| category      | Text      |
| purchase_link | Text      |

### `user_sessions`

| Field                  | Type      |
|------------------------|-----------|
| id                     | UUID      |
| user_id                | UUID      |
| uploaded_image_id      | UUID      |
| selected_furniture_ids | UUID[]    |
| generated_image_url    | Text      |
| created_at             | Timestamp |

### `furniture_placement_metadata`

| Field          | Type    |
|----------------|---------|
| id             | UUID    |
| generated_image_id | UUID |
| furniture_id   | UUID    |
| x              | Float   |
| y              | Float   |
| width          | Float   |
| height         | Float   |

---

## API Endpoint Summary

| Endpoint                          | Method | Purpose                                  |
|----------------------------------|--------|------------------------------------------|
| `/api/upload-room-image`         | POST   | Uploads room image                       |
| `/api/recommend-furniture`       | POST   | Returns AI-recommended furniture         |
| `/api/generate-room-visual`      | POST   | Generates composite room with furniture  |
| `/api/furniture-placement-metadata` | GET | Returns bounding boxes for visualization |
| `/api/user/history`              | GET    | Returns past sessions for user           |
| `/api/admin/furniture`           | CRUD   | Manage furniture database                |

---

## Next Steps

- [ ] Convert schema to Supabase migration files
- [ ] Create Next.js page components and layouts
- [ ] Connect endpoints to frontend
- [ ] Setup OpenAI API integrations
