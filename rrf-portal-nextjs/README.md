# RRF Portal - Next.js Application

Enterprise Resource Requisition Request Management System built with Next.js 14 (App Router) and Ant Design.

## 🚀 Features

- ✅ Next.js 14 with App Router
- ✅ Ant Design UI Components
- ✅ Server Components & Client Components
- ✅ Responsive Dashboard Layout
- ✅ Role-based Navigation (Hiring Manager, Approver, HR)
- ✅ Clean, Scalable Architecture

## 📁 Project Structure

```
rrf-portal-nextjs/
├── app/
│   ├── layout.jsx           # Root layout with Sidebar & Header
│   ├── page.jsx             # Home (redirects to /dashboard)
│   ├── dashboard/
│   │   └── page.jsx         # Dashboard page
│   └── globals.css          # Global styles
├── components/
│   ├── Sidebar.jsx          # Navigation sidebar
│   └── Header.jsx           # Top header with role switcher
├── package.json
├── next.config.js
└── jsconfig.json
```

## 🛠️ Installation

### Option 1: Using Docker

1. **Build and run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   ```
   http://localhost:3000
   ```

### Option 2: Using Node.js

1. **Install Node.js** (if not installed):
   - Download from https://nodejs.org/
   - Install LTS version

2. **Install dependencies:**
   ```bash
   cd rrf-portal-nextjs
   npm install
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   ```
   http://localhost:3000
   ```

## 🎨 UI Components

### Pages Converted:
- ✅ Dashboard (from hr-dashboard.html)
- 🔄 Create RRF (pending)
- 🔄 My Requests (pending)
- 🔄 HR Dashboard (pending)
- 🔄 Approver Dashboard (pending)

### Reusable Components:
- **Sidebar.jsx** - Left navigation with Ant Design Menu
- **Header.jsx** - Top bar with role switcher and user info

### Ant Design Components Used:
- Layout (Sider, Header, Content)
- Menu
- Card
- Table
- Tag
- Button
- Statistic
- Select
- Avatar
- Space

## 🔗 Routes

### Hiring Manager:
- `/dashboard` - Dashboard with statistics
- `/create-rrf` - Create new RRF request
- `/my-requests` - View all my requests

### Approver:
- `/approver` - Approver dashboard
- `/approver/pending` - On-hold requests
- `/approver/approved` - Approved requests

### HR Team:
- `/hr` - HR dashboard
- `/hr/open-hiring` - Open hiring positions
- `/hr/closed` - Closed requests

## 📝 Development Notes

- Uses Next.js 14 App Router (not Pages Router)
- All interactive components use `'use client'` directive
- Server Components by default for better performance
- Ant Design imported per component (tree-shaking enabled)
- Original HTML design preserved with custom CSS
- Path aliases configured: `@/` points to project root

## 🐳 Docker Configuration

Dockerfile and docker-compose.yml available for containerized deployment.

## 📦 Build for Production

```bash
npm run build
npm start
```

## 🎯 Next Steps

1. Convert remaining HTML pages to Next.js routes
2. Add form validation and state management
3. Integrate with backend API
4. Add authentication/authorization
5. Implement role-based access control

---

Built with ❤️ using Next.js 14 & Ant Design
