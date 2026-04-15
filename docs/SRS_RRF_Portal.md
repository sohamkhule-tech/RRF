# Software Requirements Specification (SRS)
## RRF Portal - Resource Requisition Form Management System

**Version:** 1.0  
**Date:** March 27, 2026  
**Prepared By:** Development Team  
**Organization:** DataFortune Inc.

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Features](#3-system-features)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [System Architecture](#5-system-architecture)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Database Design](#7-database-design)
8. [API Specifications](#8-api-specifications)

---

## 1. Introduction

### 1.1 Purpose
This SRS document describes the functional and non-functional requirements for the RRF (Resource Requisition Form) Portal - a web-based application designed to streamline the process of creating, managing, and tracking resource requisition requests within DataFortune Inc.

### 1.2 Scope
The RRF Portal enables:
- Hiring Managers to create and submit resource requisition requests
- PMO team to manage and process requisitions
- Tracking of billable and non-billable positions
- Multi-step form workflow with validation
- Role-based access control
- Draft management and form auto-save functionality

### 1.3 Definitions, Acronyms, and Abbreviations
- **RRF**: Resource Requisition Form
- **PMO**: Project Management Office
- **SRS**: Software Requirements Specification
- **UI**: User Interface
- **API**: Application Programming Interface
- **JWT**: JSON Web Token
- **CRUD**: Create, Read, Update, Delete

### 1.4 References
- Next.js 14.2.0 Documentation
- NestJS Documentation
- React 18 Documentation
- Ant Design Component Library

### 1.5 Overview
This document provides a detailed description of the RRF Portal system, including functional requirements, system architecture, database design, and API specifications.

---

## 2. Overall Description

### 2.1 Product Perspective
The RRF Portal is a standalone web application with the following components:
- **Frontend**: Next.js 14.2.0 with React 18 (Client Components)
- **Backend**: NestJS with TypeScript
- **Containerization**: Docker with docker-compose orchestration
- **Authentication**: JWT-based token authentication

### 2.2 Product Functions
Major functions include:
1. User Authentication and Authorization
2. Multi-step RRF Form Creation
3. Draft Management
4. RRF Request Submission and Tracking
5. Role-based Dashboard Views
6. RRF Viewing and Management
7. PDF Export Functionality

### 2.3 User Classes and Characteristics

#### 2.3.1 Hiring Manager
- **Characteristics**: Technical/Business managers requiring resources
- **Privileges**: Create RRF, save drafts, view own requests, edit own requests
- **Technical Expertise**: Basic computer literacy

#### 2.3.2 PMO (Project Management Office)
- **Characteristics**: Resource planning and allocation team
- **Privileges**: All Hiring Manager privileges + manage all RRFs, open for requisition, fill from bench
- **Technical Expertise**: Moderate technical knowledge

#### 2.3.3 Admin (Future Enhancement)
- **Characteristics**: System administrators
- **Privileges**: Full system access, user management, system configuration
- **Technical Expertise**: Advanced technical knowledge

### 2.4 Operating Environment
- **Client**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Server**: Docker containers running on Linux/Windows
- **Frontend Port**: 3000
- **Backend Port**: 4000
- **Development**: Hot reload enabled with volume mounts

### 2.5 Design and Implementation Constraints
- Must use React Client Components (not Server Components)
- Form data stored in localStorage for draft functionality
- JWT tokens for authentication with httpOnly cookies
- Responsive design required for mobile/tablet/desktop
- Multi-step form with validation at each step

### 2.6 Assumptions and Dependencies
- Users have internet connectivity
- Modern browsers with JavaScript enabled
- Docker and docker-compose available in production
- localStorage available in browser for draft management

---

## 3. System Features

### 3.1 User Authentication

#### 3.1.1 Description
Secure login system with role-based access control.

#### 3.1.2 Functional Requirements

**FR-AUTH-001**: User Login
- **Priority**: High
- **Description**: Users must authenticate with username and password
- **Input**: Username, Password
- **Processing**: Validate credentials against database, generate JWT token
- **Output**: Authentication token, user role, redirect to dashboard
- **Validation**: 
  - Username required
  - Password required
  - Invalid credentials show error message

**FR-AUTH-002**: Token Verification
- **Priority**: High
- **Description**: Verify JWT token validity on protected routes
- **Input**: JWT token from httpOnly cookie or Authorization header
- **Processing**: Decode and verify token signature and expiration
- **Output**: User information or authentication error

**FR-AUTH-003**: Role-Based Access
- **Priority**: High
- **Description**: Route access based on user role
- **Roles**: 
  - Hiring Manager: `/create-rrf`, `/my-requests`, `/drafts`, `/view-rrf/:id`
  - PMO: All Hiring Manager routes + `/pmo/*` routes

**FR-AUTH-004**: Logout
- **Priority**: Medium
- **Description**: Clear authentication token and redirect to login
- **Processing**: Remove token from cookies/storage, clear session data

### 3.2 RRF Form Creation

#### 3.2.1 Description
Multi-step form wizard for creating resource requisition requests.

#### 3.2.2 Functional Requirements

**FR-FORM-001**: Three-Step Form Navigation
- **Priority**: High
- **Description**: Form divided into three logical steps with stepper UI
- **Steps**:
  1. Requisition Details (Step 1)
  2. Position Details (Step 2)
  3. Technical Skills & Job Requirements (Step 3)
- **Navigation**: Previous/Next buttons, clickable stepper icons
- **Validation**: Each step validated before proceeding to next

**FR-FORM-002**: Step 1 - Requisition Details
- **Priority**: High
- **Required Fields**:
  - Requisition Manager Name (text input)
  - Entity (dropdown: Datafortune Inc, Techfortune Inc)
  - Organisation (auto-filled: DataFortune)
  - Function (dropdown: Delivery, Sales, Support)
  - Sub-function (conditional dropdown based on Function)
  - Department (auto-filled from Sub-function)
  - Requisition Type (dropdown: Billable, Non-Billable)
  - Job Title (text input)
  
- **Conditional Fields**:
  - **If Billable**:
    - Customer Name (required)
    - Project Name (required)
  - **If Non-Billable**:
    - Non-Billable Type (dropdown: Pipeline, Bench)
    - Project Name (optional)
    - Customer Name (optional for Pipeline)

**FR-FORM-003**: Step 2 - Position Details
- **Priority**: High
- **Required Fields**:
  - Number of Positions (numeric input, min: 1)
  - Priority Level (dropdown: Low, Medium, High, Critical)
  - Experience Range (numeric inputs: Min and Max years)
  
- **Optional Fields**:
  - Job Location (multi-select: Pune, Chennai, Bengaluru, Other/Custom)
  - Work Mode (dropdown: On-site, Remote, Hybrid)
  
- **Conditional Fields**:
  - **If Billable**:
    - Billing Rate (numeric input or "TBD" option)
    - Billing Currency (dropdown: USD, INR)
    - Anticipated Billing Start Date (date picker: DD/MM/YYYY)
  - **If Non-Billable (Bench or Pipeline)**:
    - Expected Onboarding Date (date picker: DD/MM/YYYY)

**FR-FORM-004**: Step 3 - Technical Skills
- **Priority**: High
- **Required Fields**:
  - Primary Technologies (text input)
  - Must Have Skills (textarea)
  - Job Description (rich textarea)
  
- **Optional Fields**:
  - Nice to Have Skills (textarea)
  - Additional Notes (textarea)

**FR-FORM-005**: Form Validation
- **Priority**: High
- **Description**: Validate all mandatory fields before step progression or submission
- **Validation Triggers**:
  - On Next button click
  - On stepper icon click (forward navigation)
  - On form submission
- **Validation Display**:
  - Red banner at top of form with error list
  - Dismissible error summary
  - Auto-scroll to top on validation failure
- **Rules**:
  - All required fields must be filled
  - Numeric fields must be valid numbers
  - Date fields must be valid dates in DD/MM/YYYY format
  - Experience Min must be less than Experience Max

**FR-FORM-006**: Auto-fill Logic
- **Priority**: Medium
- **Description**: Automatically fill fields based on selections
- **Rules**:
  - Organisation always "DataFortune"
  - Department auto-filled from Sub-function
  - Project Name = "Bench" when Non-Billable Type = "Bench"
  - Requisition Type = "Non-Billable" for support sub-functions (HR, TA, Accounts, IT Networking, PMO, BDE, Sales, MR, Marketing)

### 3.3 Draft Management

#### 3.3.1 Functional Requirements

**FR-DRAFT-001**: Save as Draft
- **Priority**: High
- **Description**: Save incomplete forms to localStorage
- **Input**: Current form data, all state variables
- **Processing**: 
  - Generate unique draft ID (timestamp)
  - Store form data with metadata in localStorage
  - Show success toast notification
- **Output**: Redirect to `/drafts` page
- **Storage Key**: `rrf_drafts` (array of draft objects)

**FR-DRAFT-002**: View Drafts
- **Priority**: High
- **Description**: Display list of saved drafts
- **Display**: 
  - Job Title
  - Requisition Type
  - Saved Date/Time
  - Actions (Continue Editing, Delete)

**FR-DRAFT-003**: Load Draft
- **Priority**: High
- **Description**: Load saved draft data back into form
- **Input**: Draft ID from URL parameter (`?draft=<id>`)
- **Processing**: 
  - Retrieve draft from localStorage
  - Populate all form fields
  - Restore all state variables (requisitionType, selectedLocations, etc.)
  - Set currentDraftId for update operations

**FR-DRAFT-004**: Update Draft
- **Priority**: Medium
- **Description**: Overwrite existing draft with updated data
- **Processing**: Find draft by ID and replace with current form data

**FR-DRAFT-005**: Delete Draft
- **Priority**: Medium
- **Description**: Remove draft from localStorage
- **Input**: Draft ID
- **Processing**: Filter out draft from array, update localStorage
- **Confirmation**: Show confirmation dialog before deletion

### 3.4 RRF Submission

#### 3.4.1 Functional Requirements

**FR-SUBMIT-001**: Submit RRF Request
- **Priority**: High
- **Description**: Submit completed RRF form
- **Prerequisites**: All three steps validated successfully
- **Processing**:
  - Generate unique RRF ID (format: RRF-XXX, random 3-digit number)
  - Store request in system (currently localStorage/future: API call)
  - Delete associated draft if loaded from draft
  - Show success toast with RRF ID
  - Redirect to `/my-requests`

**FR-SUBMIT-002**: RRF ID Generation
- **Priority**: High
- **Description**: Generate unique identifier for each RRF
- **Format**: `RRF-XXX` where XXX is a 3-digit number (001-999)
- **Uniqueness**: Random generation (future: sequential or UUID)

### 3.5 My Requests

#### 3.5.1 Functional Requirements

**FR-MYREQ-001**: View My Requests
- **Priority**: High
- **Description**: Display list of user's submitted RRF requests
- **Display Fields**:
  - RRF ID
  - Job Title
  - Requisition Type
  - Status (Pending, Approved, Rejected, etc.)
  - Submitted Date
  - Actions (View, Edit, Delete)
- **Filtering**: By status, date range, requisition type
- **Sorting**: By date, status, RRF ID

**FR-MYREQ-002**: View RRF Details
- **Priority**: High
- **Description**: View complete details of submitted RRF
- **Route**: `/view-rrf/:id`
- **Layout**: Premium split-panel design
  - Left Panel: Navigation sidebar with sections
    - Requisition Information
    - Position Details
    - Technical Requirements
    - Job Description
  - Right Panel: Content display with blue card backgrounds (#E3F2FD)
- **Actions**: Print, Export to PDF

**FR-MYREQ-003**: Edit RRF
- **Priority**: Medium
- **Description**: Modify submitted RRF (if status allows)
- **Constraint**: Only editable in "Draft" or "Pending" status
- **Processing**: Load RRF data into form, allow modifications, resubmit

**FR-MYREQ-004**: Delete RRF
- **Priority**: Low
- **Description**: Delete submitted RRF
- **Constraint**: Only deletable in "Draft" status
- **Confirmation**: Show confirmation dialog

### 3.6 PMO-Specific Features

#### 3.6.1 Functional Requirements

**FR-PMO-001**: PMO Dashboard
- **Priority**: High
- **Description**: Enhanced dashboard for PMO users
- **Route**: `/pmo`
- **Display**: 
  - All pending RRF requests across organization
  - Statistics (total requests, pending, approved, rejected)
  - Quick actions

**FR-PMO-002**: View All Requests
- **Priority**: High
- **Description**: PMO can view all RRF requests from all users
- **Filtering**: By manager, department, status, date range
- **Sorting**: Multi-column sorting

**FR-PMO-003**: PMO Actions on RRF
- **Priority**: High
- **Description**: Special actions available to PMO users
- **Actions**:
  - Open for Requisition (mark as actively hiring)
  - Fill from Bench (assign bench resource)
  - Approve/Reject request
- **Route**: Same `/pmo/view-rrf/:id` with split-panel layout

**FR-PMO-004**: PMO Create RRF
- **Priority**: Medium
- **Description**: PMO can create RRF on behalf of hiring managers
- **Route**: `/pmo/create-rrf`
- **Features**: Same form as hiring manager with additional field for manager selection

### 3.7 Dashboard

#### 3.7.1 Functional Requirements

**FR-DASH-001**: Role-Based Dashboard
- **Priority**: High
- **Description**: Different dashboard views based on user role
- **Hiring Manager Dashboard** (`/dashboard`):
  - My Recent Requests
  - Quick Statistics (Total Requests, Pending, Approved)
  - Quick Actions (Create New RRF, View Drafts)
- **PMO Dashboard** (`/pmo`):
  - All Organization Requests
  - Advanced Statistics
  - Team-wise breakdown
  - Priority-wise breakdown

**FR-DASH-002**: Statistics Display
- **Priority**: Medium
- **Description**: Visual representation of RRF statistics
- **Metrics**:
  - Total RRFs
  - Pending Approvals
  - Approved
  - Rejected
  - Open Positions
  - Filled Positions
- **Visualization**: Cards with numbers and trend indicators

### 3.8 Export & Print

#### 3.8.1 Functional Requirements

**FR-EXPORT-001**: Print RRF
- **Priority**: Medium
- **Description**: Print-friendly view of RRF details
- **Processing**: 
  - Open browser print dialog
  - Apply print-specific CSS styles
  - Remove navigation and action buttons from print

**FR-EXPORT-002**: Export to PDF
- **Priority**: Medium
- **Description**: Generate PDF document of RRF
- **Format**: Professional PDF with company branding
- **Content**: Complete RRF details in structured format
- **Download**: Automatic download with filename: `RRF-{ID}_{Date}.pdf`

---

## 4. External Interface Requirements

### 4.1 User Interfaces

#### 4.1.1 General UI Requirements
- **Design System**: Premium corporate design with indigo (#4F46E5) primary color
- **Responsive**: Mobile-first design (breakpoints: 640px, 768px, 1024px, 1280px)
- **Typography**: 
  - Headings: Bold, slate-800
  - Body: Regular, gray-700
  - Labels: Semi-bold, gray-800
- **Form Elements**:
  - Input fields: Rounded corners (8px), border on hover/focus
  - Focus state: 2px indigo ring
  - Disabled state: Gray background (#F3F4F6)
- **Buttons**:
  - Primary: Indigo background, white text
  - Secondary: White background, indigo border
  - Hover: Slight scale (105%)

#### 4.1.2 Login Page
- **Route**: `/login`
- **Layout**: Centered card on gradient background
- **Elements**:
  - Logo/Branding
  - Username field
  - Password field (with show/hide toggle)
  - Remember me checkbox
  - Login button
  - Error message display area

#### 4.1.3 Navigation
- **Header**: 
  - Logo (left)
  - Navigation links (center): Dashboard, Create RRF, My Requests, Drafts
  - User menu (right): Username, Role badge, Logout
- **Responsive**: Hamburger menu on mobile

#### 4.1.4 Form Stepper
- **Layout**: Horizontal stepper with 3 steps
- **Design**:
  - Perfectly centered with equal edge spacing
  - Flex layout with spacers (`flex-1` on edges)
  - Fixed-width connectors (128px) and labels (128px)
  - Icons: 48px diameter circles
  - Connector lines: 2px height, animated color change
- **States**:
  - Completed: Indigo background, checkmark icon
  - Active: Indigo background, scaled (110%)
  - Inactive: White background, gray text
  - Hover: Scale effect, border color change

#### 4.1.5 View RRF - Split Panel Layout
- **Layout**: Two-column grid
- **Left Panel** (sticky, 30% width):
  - Section navigation buttons
  - Active section highlighted
  - Smooth scrolling on click
- **Right Panel** (scrollable, 70% width):
  - Content sections with blue cards (#E3F2FD)
  - Section headers
  - Data display in label-value format

#### 4.1.6 Validation Error Display
- **Banner**: Top of form, red theme (#FEF2F2 background, #EF4444 border)
- **Content**: 
  - Warning icon
  - Heading: "Please complete the following required fields:"
  - Bullet list of errors
  - Dismissible close button
- **Animation**: Fade-in effect
- **Auto-scroll**: Page scrolls to top to show banner

### 4.2 Hardware Interfaces
Not applicable - web-based application

### 4.3 Software Interfaces

#### 4.3.1 Frontend-Backend Communication
- **Protocol**: HTTP/HTTPS
- **Format**: JSON
- **Authentication**: JWT token in Authorization header or httpOnly cookie
- **Base URL**: `http://localhost:4000` (development), `https://api.domain.com` (production)

#### 4.3.2 Browser Local Storage
- **Usage**: Draft management
- **Keys**:
  - `rrf_drafts`: Array of draft objects
- **Data Structure**:
```json
{
  "id": "1234567890",
  "data": { /* form data */ },
  "savedAt": "2026-03-27T10:30:00.000Z",
  "requisitionType": "Billable",
  "nonBillableSubType": "",
  "selectedLocations": ["Pune", "Chennai"],
  "showOtherLocation": false,
  "billingRateType": "amount",
  "billingCurrency": "USD"
}
```

#### 4.3.3 External Libraries
- **Next.js**: 14.2.0 - React framework
- **React**: 18 - UI library
- **Ant Design Icons**: Icon components
- **React Hot Toast**: Toast notifications (to be removed in favor of inline errors)
- **Tailwind CSS**: Utility-first CSS framework

---

## 5. System Architecture

### 5.1 Architecture Overview
The RRF Portal follows a **Microservices Architecture** with clear separation between frontend and backend.

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Next.js Frontend (Port 3000)                  │ │
│  │  - React Components                                     │ │
│  │  - Client-side routing (useRouter)                      │ │
│  │  - State management (useState, useEffect)               │ │
│  │  - LocalStorage for drafts                              │ │
│  └────────────────┬───────────────────────────────────────┘ │
└───────────────────┼───────────────────────────────────────────┘
                    │ HTTP/HTTPS (JSON)
                    │ JWT Authentication
                    ▼
┌─────────────────────────────────────────────────────────────┐
│             NestJS Backend API (Port 4000)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Controllers (HTTP Endpoints)                           │ │
│  │   ├── AuthController                                    │ │
│  │   ├── RRFController                                     │ │
│  │   └── UserController                                    │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  Services (Business Logic)                              │ │
│  │   ├── AuthService (JWT verification)                    │ │
│  │   ├── RRFService                                        │ │
│  │   └── UserService                                       │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  Guards (Authorization)                                 │ │
│  │   ├── LocalAuthGuard (Passport)                         │ │
│  │   └── JwtAuthGuard                                      │ │
│  └────────────────┬───────────────────────────────────────┘ │
└───────────────────┼───────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│               Database (Future Implementation)               │
│  - User credentials                                          │
│  - RRF records                                               │
│  - Roles & permissions                                       │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Component Architecture

#### 5.2.1 Frontend Architecture
```
app/
├── (auth)/
│   └── login/
│       └── page.jsx                    # Login page
├── create-rrf/
│   └── page.jsx                        # Create RRF form (Hiring Manager)
├── my-requests/
│   └── page.jsx                        # User's RRF list
├── drafts/
│   └── page.jsx                        # Saved drafts list
├── view-rrf/
│   └── [id]/
│       └── page.jsx                    # View RRF details (split-panel)
├── pmo/
│   ├── page.jsx                        # PMO dashboard
│   ├── create-rrf/
│   │   └── page.jsx                    # Create RRF (PMO)
│   └── view-rrf/
│       └── [id]/
│           └── page.jsx                # View RRF (PMO with actions)
├── dashboard/
│   └── page.jsx                        # User dashboard
└── components/
    └── MaskedDateInput.jsx            # Custom date input component
```

#### 5.2.2 Backend Architecture
```
src/
├── auth/
│   ├── auth.controller.ts              # /auth/login, /auth/verify
│   ├── auth.service.ts                 # JWT generation, token verification
│   ├── local-auth.guard.ts             # Passport LocalStrategy guard
│   └── local.strategy.ts               # Username/password validation
├── users/
│   ├── users.controller.ts             # User CRUD endpoints
│   └── users.service.ts                # User management logic
├── rrf/                                 # (Future implementation)
│   ├── rrf.controller.ts
│   └── rrf.service.ts
└── main.ts                             # NestJS bootstrap
```

### 5.3 Data Flow

#### 5.3.1 Authentication Flow
```
1. User enters credentials → Login Page
2. POST /auth/login → AuthController
3. LocalAuthGuard validates credentials → LocalStrategy
4. Valid? → AuthService.login()
5. JWT generated → HttpOnly cookie set
6. Response: { user: {...}, role: "..." }
7. Frontend stores user data → Redirects to dashboard
```

#### 5.3.2 RRF Creation Flow
```
1. User navigates to Create RRF → /create-rrf
2. Form loads with Step 1 → useState initializes formData
3. User fills Step 1 fields → handleChange updates formData
4. User clicks Next → validateStep(1) runs
5. Valid? → setCurrentStep(2)
6. Invalid? → Show validation banner
7. Repeat for Steps 2 & 3
8. User clicks Submit → handleSubmit()
9. Generate RRF ID → Save to localStorage
10. Show success toast → Redirect to /my-requests
```

#### 5.3.3 Draft Save/Load Flow
```
# Save Draft:
1. User clicks "Save as Draft" → saveDraft()
2. Generate draft ID → timestamp
3. Collect all form state → draft object
4. localStorage.setItem('rrf_drafts') → Array.push(draft)
5. Show toast → Redirect to /drafts

# Load Draft:
1. User clicks "Continue Editing" → /create-rrf?draft={id}
2. useEffect detects draft parameter
3. localStorage.getItem('rrf_drafts')
4. Find draft by ID → Populate formData & state
5. User continues editing
```

### 5.4 Docker Configuration

#### 5.4.1 Docker Compose Services
```yaml
services:
  backend:
    build: ./rrf-portal-backend
    ports: 4000:4000
    environment:
      - NODE_ENV=production
    
  frontend:
    build: ./rrf-portal-nextjs
    ports: 3000:3000
    volumes:
      - ./rrf-portal-nextjs:/app      # Live code sync
      - /app/node_modules              # Exclude node_modules
      - /app/.next                     # Exclude .next cache
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:4000
      - WATCHPACK_POLLING=true         # Enable hot reload
      - CHOKIDAR_USEPOLLING=true       # File watching in Docker
```

#### 5.4.2 Hot Reload Configuration
- **Volume Mounts**: Host code → Container `/app` directory
- **File Watching**: Polling enabled for Docker environment
- **Next.js Config**: Webpack polling (1000ms interval)
- **Result**: Code changes automatically reflected without restart

---

## 6. Non-Functional Requirements

### 6.1 Performance Requirements

**NFR-PERF-001**: Page Load Time
- **Requirement**: Initial page load < 3 seconds on 4G connection
- **Measurement**: Time to Interactive (TTI)
- **Optimization**: Code splitting, lazy loading, image optimization

**NFR-PERF-002**: Form Submission
- **Requirement**: Form submission response < 1 second
- **Measurement**: Time from submit click to success message

**NFR-PERF-003**: Hot Reload
- **Requirement**: Code changes detected and compiled within 2-3 seconds
- **Current**: Next.js compilation ~1-2 seconds per change

**NFR-PERF-004**: Concurrent Users
- **Target**: Support 100 concurrent users without degradation
- **Future**: Load balancing for 1000+ users

### 6.2 Security Requirements

**NFR-SEC-001**: Authentication
- **Requirement**: JWT token-based authentication
- **Token Expiration**: 24 hours (configurable)
- **Token Storage**: HttpOnly cookies (prevent XSS)
- **Password**: Bcrypt hashing (10 rounds)

**NFR-SEC-002**: Authorization
- **Requirement**: Role-based access control (RBAC)
- **Enforcement**: Route-level guards
- **Verification**: Token verified on every protected request

**NFR-SEC-003**: Input Validation
- **Requirement**: All user inputs sanitized and validated
- **Frontend**: Client-side validation for UX
- **Backend**: Server-side validation (mandatory)
- **Protection**: XSS, SQL injection prevention

**NFR-SEC-004**: HTTPS
- **Requirement**: All production traffic over HTTPS
- **TLS Version**: 1.2 or higher
- **Certificate**: Valid SSL certificate

**NFR-SEC-005**: Data Privacy
- **Requirement**: Sensitive data encrypted at rest (future)
- **PII Handling**: GDPR compliance considerations
- **Access Logs**: Audit trail of data access

### 6.3 Usability Requirements

**NFR-USA-001**: Learnability
- **Requirement**: New users can create RRF within 10 minutes
- **Help**: Tooltips, placeholder text, field descriptions
- **Onboarding**: Future: guided tour

**NFR-USA-002**: Accessibility
- **Standard**: WCAG 2.1 Level AA compliance
- **Features**:
  - Keyboard navigation support
  - Screen reader compatibility
  - Sufficient color contrast (4.5:1 minimum)
  - Focus indicators visible

**NFR-USA-003**: Responsive Design
- **Requirement**: Fully functional on mobile, tablet, desktop
- **Breakpoints**: 640px, 768px, 1024px, 1280px
- **Touch**: Touch-friendly targets (min 44x44px)

**NFR-USA-004**: Error Messages
- **Requirement**: Clear, actionable error messages
- **Style**: Professional validation banner (no intrusive popups)
- **Content**: Specific field names, guidance on fixing

### 6.4 Reliability Requirements

**NFR-REL-001**: Availability
- **Target**: 99.9% uptime (8.76 hours downtime/year)
- **Monitoring**: Health check endpoints
- **Recovery**: Automatic container restart on failure

**NFR-REL-002**: Data Persistence
- **Drafts**: Stored in browser localStorage (not lost on refresh)
- **Limitations**: LocalStorage cleared if user clears browser data
- **Future**: Server-side draft storage

**NFR-REL-003**: Error Handling
- **Requirement**: Graceful error handling, no crashes
- **User Feedback**: Friendly error messages
- **Logging**: Errors logged for debugging

**NFR-REL-004**: Browser Compatibility
- **Supported**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Testing**: Cross-browser testing before release

### 6.5 Maintainability Requirements

**NFR-MAIN-001**: Code Quality
- **Standard**: ESLint rules enforced
- **Comments**: Complex logic documented
- **Naming**: Clear, descriptive variable/function names

**NFR-MAIN-002**: Version Control
- **System**: Git with branching strategy
- **Commits**: Descriptive commit messages
- **Reviews**: Code review process

**NFR-MAIN-003**: Documentation
- **Code**: Inline comments for complex logic
- **API**: API documentation (future: Swagger)
- **Setup**: README with setup instructions

**NFR-MAIN-004**: Modularity
- **Structure**: Component-based architecture
- **Reusability**: Shared components in `/components`
- **Separation**: Clear separation of concerns (Controller-Service pattern)

### 6.6 Scalability Requirements

**NFR-SCAL-001**: Horizontal Scaling
- **Requirement**: Ability to scale frontend/backend independently
- **Docker**: Multiple containers behind load balancer
- **Database**: Connection pooling (future)

**NFR-SCAL-002**: Data Volume
- **Target**: Handle 10,000+ RRF records
- **Pagination**: Required for large datasets
- **Indexing**: Database indexes on frequently queried fields

---

## 7. Database Design

### 7.1 Database Schema (Conceptual)

**Note**: Current implementation uses localStorage. This section describes the future database schema.

#### 7.1.1 Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('hiring_manager', 'pmo', 'admin')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
```

#### 7.1.2 RRF Requests Table
```sql
CREATE TABLE rrf_requests (
  id SERIAL PRIMARY KEY,
  rrf_id VARCHAR(20) UNIQUE NOT NULL,  -- Format: RRF-001
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Step 1: Requisition Details
  manager_name VARCHAR(100) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  organisation VARCHAR(50) DEFAULT 'DataFortune',
  function VARCHAR(50) NOT NULL,
  sub_function VARCHAR(50) NOT NULL,
  department VARCHAR(50),
  requisition_type VARCHAR(20) NOT NULL CHECK (requisition_type IN ('Billable', 'Non-Billable')),
  customer_name VARCHAR(100),
  project_name VARCHAR(100),
  job_title VARCHAR(100) NOT NULL,
  non_billable_sub_type VARCHAR(20) CHECK (non_billable_sub_type IN ('Pipeline', 'Bench')),
  
  -- Step 2: Position Details
  billing_rate DECIMAL(10,2),
  billing_currency VARCHAR(3) DEFAULT 'USD',
  billing_start_date DATE,
  expected_onboarding_date DATE,
  position_type VARCHAR(20),
  positions INTEGER NOT NULL CHECK (positions > 0),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  location TEXT[],  -- Array of locations
  other_location VARCHAR(100),
  work_mode VARCHAR(20) CHECK (work_mode IN ('On-site', 'Remote', 'Hybrid')),
  experience_min INTEGER NOT NULL CHECK (experience_min >= 0),
  experience_max INTEGER NOT NULL CHECK (experience_max >= experience_min),
  
  -- Step 3: Technical Skills
  technologies TEXT NOT NULL,
  must_have_skills TEXT NOT NULL,
  nice_to_have_skills TEXT,
  job_description TEXT NOT NULL,
  additional_notes TEXT,
  
  -- Status & Metadata
  status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Draft', 'Pending', 'Approved', 'Rejected', 'Open', 'Filled', 'Closed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP
);

CREATE INDEX idx_rrf_rrf_id ON rrf_requests(rrf_id);
CREATE INDEX idx_rrf_user_id ON rrf_requests(user_id);
CREATE INDEX idx_rrf_status ON rrf_requests(status);
CREATE INDEX idx_rrf_created_at ON rrf_requests(created_at DESC);
```

#### 7.1.3 RRF Drafts Table
```sql
CREATE TABLE rrf_drafts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  draft_data JSONB NOT NULL,  -- Complete form data as JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drafts_user_id ON rrf_drafts(user_id);
```

#### 7.1.4 RRF History/Audit Table
```sql
CREATE TABLE rrf_history (
  id SERIAL PRIMARY KEY,
  rrf_id INTEGER REFERENCES rrf_requests(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,  -- 'created', 'updated', 'approved', 'rejected', etc.
  changes JSONB,  -- Diff of changes
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_history_rrf_id ON rrf_history(rrf_id);
```

### 7.2 Entity-Relationship Diagram

```
┌─────────────┐
│    Users    │
│─────────────│
│ id (PK)     │
│ username    │
│ password    │
│ role        │
│ email       │
│ created_at  │
└──────┬──────┘
       │ 1
       │
       │ creates
       │
       │ *
┌──────▼──────────────┐
│   RRF_Requests      │
│─────────────────────│
│ id (PK)             │
│ rrf_id (UK)         │
│ user_id (FK)        │
│ manager_name        │
│ requisition_type    │
│ job_title           │
│ status              │
│ ... (all fields)    │
│ created_at          │
└──────┬──────────────┘
       │ 1
       │
       │ has
       │
       │ *
┌──────▼──────────┐
│  RRF_History    │
│─────────────────│
│ id (PK)         │
│ rrf_id (FK)     │
│ user_id (FK)    │
│ action          │
│ changes         │
│ created_at      │
└─────────────────┘

┌─────────────┐
│    Users    │
└──────┬──────┘
       │ 1
       │
       │ saves
       │
       │ *
┌──────▼──────────┐
│   RRF_Drafts    │
│─────────────────│
│ id (PK)         │
│ user_id (FK)    │
│ draft_data      │
│ created_at      │
└─────────────────┘
```

---

## 8. API Specifications

### 8.1 Authentication APIs

#### 8.1.1 Login
**Endpoint**: `POST /auth/login`

**Description**: Authenticate user and generate JWT token

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "username": "john.doe",
  "password": "securePassword123"
}
```

**Success Response** (200 OK):
```json
{
  "user": {
    "id": 1,
    "username": "john.doe",
    "fullName": "John Doe",
    "email": "john.doe@datafortune.com",
    "role": "hiring_manager"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response** (401 Unauthorized):
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

**Side Effects**:
- Sets httpOnly cookie with JWT token
- Cookie name: `access_token`
- Expires: 24 hours

---

#### 8.1.2 Verify Token
**Endpoint**: `POST /auth/verify`

**Description**: Verify JWT token validity

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response** (200 OK):
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "username": "john.doe",
    "role": "hiring_manager"
  }
}
```

**Error Response** (401 Unauthorized):
```json
{
  "valid": false,
  "error": "Invalid or expired token"
}
```

---

### 8.2 RRF APIs (Future Implementation)

#### 8.2.1 Create RRF
**Endpoint**: `POST /rrf`

**Description**: Submit new RRF request

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body**:
```json
{
  "managerName": "John Doe",
  "entity": "Datafortune Inc",
  "organisation": "DataFortune",
  "function": "Delivery",
  "subFunction": "SGINTL",
  "department": "SGINTL",
  "requisitionType": "Billable",
  "customerName": "ABC Corp",
  "projectName": "Project Phoenix",
  "jobTitle": "Senior React Developer",
  "billingRate": "150",
  "billingCurrency": "USD",
  "billingStartDate": "15/04/2026",
  "positions": "2",
  "priority": "High",
  "location": ["Pune", "Remote"],
  "workMode": "Hybrid",
  "experienceMin": "5",
  "experienceMax": "8",
  "technologies": "React, Node.js, TypeScript",
  "mustHaveSkills": "- 5+ years React experience\n- Strong TypeScript\n- REST API design",
  "niceToHaveSkills": "- AWS experience\n- DevOps knowledge",
  "jobDescription": "We are looking for a Senior React Developer...",
  "additionalNotes": "Urgent requirement"
}
```

**Success Response** (201 Created):
```json
{
  "message": "RRF created successfully",
  "rrfId": "RRF-432",
  "data": {
    "id": 15,
    "rrfId": "RRF-432",
    "status": "Pending",
    "createdAt": "2026-03-27T14:30:00.000Z"
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "statusCode": 400,
  "message": [
    "managerName should not be empty",
    "experienceMin must be a number"
  ],
  "error": "Bad Request"
}
```

---

#### 8.2.2 Get My RRFs
**Endpoint**: `GET /rrf/my-requests`

**Description**: Get all RRFs created by authenticated user

**Request Headers**:
```
Authorization: Bearer {token}
```

**Query Parameters**:
- `status` (optional): Filter by status (e.g., "Pending", "Approved")
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Success Response** (200 OK):
```json
{
  "data": [
    {
      "id": 15,
      "rrfId": "RRF-432",
      "jobTitle": "Senior React Developer",
      "requisitionType": "Billable",
      "status": "Pending",
      "positions": 2,
      "priority": "High",
      "createdAt": "2026-03-27T14:30:00.000Z",
      "submittedAt": "2026-03-27T14:35:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

---

#### 8.2.3 Get RRF by ID
**Endpoint**: `GET /rrf/:id`

**Description**: Get detailed information of specific RRF

**Request Headers**:
```
Authorization: Bearer {token}
```

**Path Parameters**:
- `id`: RRF ID (e.g., "RRF-432" or numeric ID)

**Success Response** (200 OK):
```json
{
  "id": 15,
  "rrfId": "RRF-432",
  "managerName": "John Doe",
  "entity": "Datafortune Inc",
  "jobTitle": "Senior React Developer",
  "requisitionType": "Billable",
  "customerName": "ABC Corp",
  "projectName": "Project Phoenix",
  "positions": 2,
  "priority": "High",
  "status": "Pending",
  "technologies": "React, Node.js, TypeScript",
  "mustHaveSkills": "- 5+ years React experience...",
  "jobDescription": "We are looking for...",
  "createdAt": "2026-03-27T14:30:00.000Z",
  "updatedAt": "2026-03-27T14:35:00.000Z"
}
```

**Error Response** (404 Not Found):
```json
{
  "statusCode": 404,
  "message": "RRF not found",
  "error": "Not Found"
}
```

---

#### 8.2.4 Get All RRFs (PMO Only)
**Endpoint**: `GET /rrf`

**Description**: Get all RRFs across organization (PMO access only)

**Request Headers**:
```
Authorization: Bearer {token}
```

**Query Parameters**:
- `status` (optional): Filter by status
- `department` (optional): Filter by department
- `priority` (optional): Filter by priority
- `page` (optional): Page number
- `limit` (optional): Items per page

**Success Response** (200 OK):
```json
{
  "data": [
    {
      "id": 15,
      "rrfId": "RRF-432",
      "managerName": "John Doe",
      "jobTitle": "Senior React Developer",
      "department": "SGINTL",
      "status": "Pending",
      "priority": "High",
      "createdAt": "2026-03-27T14:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15
  }
}
```

**Authorization**: Requires PMO role

**Error Response** (403 Forbidden):
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```

---

#### 8.2.5 Update RRF Status (PMO Only)
**Endpoint**: `PATCH /rrf/:id/status`

**Description**: Update RRF status (Approve, Reject, Open, etc.)

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Path Parameters**:
- `id`: RRF ID

**Request Body**:
```json
{
  "status": "Approved",
  "comment": "Approved for immediate hiring"
}
```

**Success Response** (200 OK):
```json
{
  "message": "RRF status updated successfully",
  "data": {
    "id": 15,
    "rrfId": "RRF-432",
    "status": "Approved",
    "updatedAt": "2026-03-27T15:00:00.000Z"
  }
}
```

---

### 8.3 Draft APIs (Future Implementation)

#### 8.3.1 Save Draft
**Endpoint**: `POST /rrf/drafts`

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body**:
```json
{
  "draftData": {
    "managerName": "John Doe",
    "entity": "Datafortune Inc",
    "requisitionType": "Billable"
    // ... partial form data
  }
}
```

**Success Response** (201 Created):
```json
{
  "message": "Draft saved successfully",
  "draftId": 5,
  "savedAt": "2026-03-27T14:20:00.000Z"
}
```

---

#### 8.3.2 Get My Drafts
**Endpoint**: `GET /rrf/drafts`

**Request Headers**:
```
Authorization: Bearer {token}
```

**Success Response** (200 OK):
```json
{
  "data": [
    {
      "id": 5,
      "jobTitle": "React Developer",
      "requisitionType": "Billable",
      "savedAt": "2026-03-27T14:20:00.000Z"
    }
  ]
}
```

---

#### 8.3.3 Load Draft
**Endpoint**: `GET /rrf/drafts/:id`

**Request Headers**:
```
Authorization: Bearer {token}
```

**Success Response** (200 OK):
```json
{
  "id": 5,
  "draftData": {
    "managerName": "John Doe",
    "entity": "Datafortune Inc",
    "requisitionType": "Billable"
    // ... complete draft data
  },
  "savedAt": "2026-03-27T14:20:00.000Z"
}
```

---

#### 8.3.4 Delete Draft
**Endpoint**: `DELETE /rrf/drafts/:id`

**Request Headers**:
```
Authorization: Bearer {token}
```

**Success Response** (200 OK):
```json
{
  "message": "Draft deleted successfully"
}
```

---

## 9. Appendices

### 9.1 Glossary
- **RRF**: Resource Requisition Form - A formal request for hiring new resources
- **PMO**: Project Management Office - Team responsible for resource planning
- **Billable**: Resources whose time is charged to clients
- **Non-Billable**: Internal resources not charged to clients
- **Bench**: Available resources not currently assigned to projects
- **Pipeline**: Future hiring for anticipated projects
- **JWT**: JSON Web Token - Compact token format for authentication
- **Docker**: Containerization platform for consistent deployments

### 9.2 Acronyms
- **SRS**: Software Requirements Specification
- **UI**: User Interface
- **UX**: User Experience
- **API**: Application Programming Interface
- **CRUD**: Create, Read, Update, Delete
- **HTTPS**: Hypertext Transfer Protocol Secure
- **JSON**: JavaScript Object Notation
- **SQL**: Structured Query Language
- **WCAG**: Web Content Accessibility Guidelines
- **RBAC**: Role-Based Access Control

### 9.3 Assumptions
1. All users have modern web browsers with JavaScript enabled
2. Internet connectivity available for all users
3. Company has infrastructure to host Docker containers
4. Users are computer-literate with basic form-filling skills
5. Peak concurrent users will not exceed 100 initially

### 9.4 Constraints
1. Must maintain backward compatibility during updates
2. Cannot modify React to Server Components (useSearchParams constraint)
3. localStorage size limit (typically 5-10 MB per domain)
4. Browser compatibility limitations
5. Development timeline and budget constraints

### 9.5 Future Enhancements
1. **Database Integration**: Replace localStorage with PostgreSQL/MySQL
2. **Email Notifications**: Automated emails on RRF status changes
3. **Advanced Search**: Full-text search with filters
4. **Analytics Dashboard**: Charts and graphs for RRF metrics
5. **Mobile App**: Native iOS/Android applications
6. **Approval Workflow**: Multi-level approval process
7. **Integration**: Connect with HRMS, ATS systems
8. **Reports**: Export reports in Excel, PDF formats
9. **Comments**: Commenting system on RRF requests
10. **Attachments**: Upload job descriptions, contracts
11. **Calendar Integration**: Sync dates with calendar
12. **Bulk Operations**: Bulk approve/reject RRFs

---

## Document History

| Version | Date       | Author           | Changes                          |
|---------|------------|------------------|----------------------------------|
| 1.0     | 2026-03-27 | Development Team | Initial SRS document creation    |

---

**Document Status**: ✅ Final  
**Review Status**: Pending Review  
**Approval Status**: Pending Approval
