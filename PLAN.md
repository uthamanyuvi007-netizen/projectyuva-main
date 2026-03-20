# Online Examination and Proctoring System - Project Plan

## Project Overview
- **Project Name**: Online Examination and Proctoring System
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js with Express
- **Database**: SQLite
- **UI Style**: Premium, attractive, colorful, interactive

## Modules & Features

### 1. Authentication Module
- Login page with eye icon to toggle password visibility
- Registration page with eye icon for password
- Role-based login: Admin, Staff (Teacher), Student
- Teacher request system: Teachers register → Admin approves → Account verified
- JWT-based authentication
- Password hashing with bcrypt

### 2. Admin Module
- Admin dashboard with overview statistics
- Manage all users (approve teachers, manage students)
- View all exams and results
- System settings
- Full control over everything

### 3. Student Module
- Student dashboard
- View available exams
- Write exams
- View results
- Profile management
- Camera access for proctoring

### 4. Question Bank Module
- Create/Edit/Delete questions
- Multiple question types (MCQ, True/False, Short Answer)
- Categorize by subject/topic
- Import/Export questions

### 5. Exam Management Module
- Create exams with time limits
- Assign questions from question bank
- Set exam schedules
- View student submissions

### 6. AI Proctoring Module
- Camera monitoring during exam
- Face detection alerts
- Tab switching detection
- Screenshot capture
- Real-time monitoring dashboard for teachers

### 7. Evaluation & Result Module
- Auto-grading for MCQ
- Manual grading for descriptive
- Result generation
- Detailed analytics
- Download reports

## UI/UX Design

### Color Scheme
- Primary: Deep Purple (#6C63FF)
- Secondary: Coral (#FF6B6B)
- Accent: Teal (#00D9C0)
- Background: Light gradient (#F8F9FE)
- Dark accents: #2D3436

### Pages to Create
1. **index.html** - Landing/Home page (attractive, colorful)
2. **login.html** - Login with eye icon
3. **register.html** - Registration with role selection
4. **admin-dashboard.html** - Admin control panel
5. **teacher-dashboard.html** - Teacher dashboard
6. **student-dashboard.html** - Student dashboard
7. **exam-list.html** - Available exams
8. **exam-take.html** - Exam taking interface with proctoring
9. **question-bank.html** - Question management
10. **create-exam.html** - Exam creation
11. **results.html** - View results
12. **profile.html** - User profile

### Backend Structure (Node.js)
- server.js - Main server file
- /routes - API routes
- /controllers - Business logic
- /models - Database models
- /middleware - Auth middleware
- /database - SQLite setup

## File Structure
```
/projectyuva
├── public/
│   ├── css/
│   │   ├── style.css
│   │   ├── dashboard.css
│   │   └── exam.css
│   ├── js/
│   │   ├── main.js
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── exam.js
│   │   └── proctoring.js
│   └── images/
├── src/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── middleware/
│   └── database/
├── views/
├── package.json
├── server.js
└── PLAN.md
```

## Implementation Steps

### Phase 1: Backend Setup
1. Initialize Node.js project
2. Set up Express server
3. Configure SQLite database
4. Create database models
5. Implement authentication API
6. Create all API endpoints

### Phase 2: Frontend Development
1. Create attractive home page
2. Build login/register with password toggle
3. Create dashboards for each role
4. Implement exam interfaces
5. Add AI proctoring features

### Phase 3: Integration
1. Connect frontend with backend
2. Test all features
3. Polish UI/UX
4. Add animations and interactions
