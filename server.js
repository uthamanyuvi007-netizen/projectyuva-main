const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'online-exam-proctoring-secret-key-2024';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'exam-proctoring-session-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Database Setup
const db = new sqlite3.Database('./exam_system.db', (err) => {
    if (err) console.error(err.message);
    else console.log('Connected to SQLite database');
});

// Initialize Database Tables
db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Questions Table
    db.run(`CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER,
        subject TEXT NOT NULL,
        question_text TEXT NOT NULL,
        question_type TEXT NOT NULL,
        options TEXT,
        correct_answer TEXT NOT NULL,
        marks INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(teacher_id) REFERENCES users(id)
    )`);

    // Exams Table
    db.run(`CREATE TABLE IF NOT EXISTS exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        subject TEXT NOT NULL,
        duration INTEGER NOT NULL,
        total_marks INTEGER,
        passing_marks INTEGER,
        scheduled_date TEXT,
        created_by INTEGER,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(created_by) REFERENCES users(id)
    )`);

    // Exam Questions (mapping)
    db.run(`CREATE TABLE IF NOT EXISTS exam_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_id INTEGER,
        question_id INTEGER,
        FOREIGN KEY(exam_id) REFERENCES exams(id),
        FOREIGN KEY(question_id) REFERENCES questions(id)
    )`);

    // Student Exam Submissions
    db.run(`CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_id INTEGER,
        student_id INTEGER,
        answers TEXT,
        marks_obtained INTEGER,
        status TEXT DEFAULT 'pending',
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(exam_id) REFERENCES exams(id),
        FOREIGN KEY(student_id) REFERENCES users(id)
    )`);

    // Proctoring Logs
    db.run(`CREATE TABLE IF NOT EXISTS proctoring_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        exam_id INTEGER,
        event_type TEXT,
        event_data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(student_id) REFERENCES users(id),
        FOREIGN KEY(exam_id) REFERENCES exams(id)
    )`);
});

// Auth Middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Role-based middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    };
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if admin already exists
    if (role === 'admin') {
        db.get(`SELECT id, name, email FROM users WHERE role = 'admin'`, [], (err, row) => {
            if (err) return res.status(500).json({ message: 'Error checking admin' });
            
            if (row) {
                return res.status(400).json({ 
                    message: `Admin account already exists. Only one admin is allowed.\n\nExisting Admin:\nName: ${row.name}\nEmail: ${row.email}\n\nPlease login with this account or contact the admin.`
                });
            }
            
            // Create admin account
            createUser(name, email, password, role, res);
        });
    } else {
        // For teachers and students
        createUser(name, email, password, role, res);
    }
});

// Helper function to create user
function createUser(name, email, password, role, res) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const status = role === 'teacher' ? 'pending' : 'active';

    db.run(`INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)`,
        [name, email, hashedPassword, role, status],
        function(err) {
            if (err) {
                return res.status(400).json({ message: 'Email already exists' });
            }
            res.json({ 
                message: role === 'teacher' ? 'Registration pending admin approval' : 'Registration successful',
                userId: this.lastID
            });
        }
    );
}

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err || !user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (user.status === 'pending') {
            return res.status(400).json({ message: 'Account pending admin approval' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    });
});

// ==================== ADMIN ROUTES ====================

// Get all pending teachers
app.get('/api/admin/pending-teachers', authenticate, authorize('admin'), (req, res) => {
    db.all(`SELECT * FROM users WHERE role = 'teacher' AND status = 'pending'`, [], (err, teachers) => {
        if (err) return res.status(500).json({ message: 'Error fetching teachers' });
        res.json(teachers);
    });
});

// Approve teacher
app.post('/api/admin/approve-teacher/:id', authenticate, authorize('admin'), (req, res) => {
    db.run(`UPDATE users SET status = 'active' WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: 'Error approving teacher' });
        res.json({ message: 'Teacher approved successfully' });
    });
});

// Reject teacher
app.post('/api/admin/reject-teacher/:id', authenticate, authorize('admin'), (req, res) => {
    db.run(`DELETE FROM users WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: 'Error rejecting teacher' });
        res.json({ message: 'Teacher rejected' });
    });
});

// Get all users
app.get('/api/admin/users', authenticate, authorize('admin'), (req, res) => {
    db.all(`SELECT id, name, email, role, status, created_at FROM users`, [], (err, users) => {
        if (err) return res.status(500).json({ message: 'Error fetching users' });
        res.json(users);
    });
});

// Get dashboard stats
app.get('/api/admin/stats', authenticate, authorize('admin'), (req, res) => {
    db.get(`SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'student') as students,
        (SELECT COUNT(*) FROM users WHERE role = 'teacher') as teachers,
        (SELECT COUNT(*) FROM exams) as exams,
        (SELECT COUNT(*) FROM submissions) as submissions`, 
        [], (err, stats) => {
            if (err) return res.status(500).json({ message: 'Error fetching stats' });
            res.json(stats);
        }
    );
});

// ==================== TEACHER ROUTES ====================

// Get teacher's questions
app.get('/api/teacher/questions', authenticate, authorize('admin', 'teacher'), (req, res) => {
    const query = req.user.role === 'admin' 
        ? `SELECT q.*, u.name as teacher_name FROM questions q LEFT JOIN users u ON q.teacher_id = u.id`
        : `SELECT * FROM questions WHERE teacher_id = ?`;
    
    const params = req.user.role === 'teacher' ? [req.user.id] : [];
    
    db.all(query, params, (err, questions) => {
        if (err) return res.status(500).json({ message: 'Error fetching questions' });
        res.json(questions);
    });
});

// Add question
app.post('/api/teacher/questions', authenticate, authorize('admin', 'teacher'), (req, res) => {
    const { subject, question_text, question_type, options, correct_answer, marks } = req.body;
    
    db.run(`INSERT INTO questions (teacher_id, subject, question_text, question_type, options, correct_answer, marks) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, subject, question_text, question_type, JSON.stringify(options), correct_answer, marks],
        function(err) {
            if (err) return res.status(500).json({ message: 'Error adding question' });
            res.json({ message: 'Question added successfully', id: this.lastID });
        }
    );
});

// Delete question
app.delete('/api/teacher/questions/:id', authenticate, authorize('admin', 'teacher'), (req, res) => {
    db.run(`DELETE FROM questions WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: 'Error deleting question' });
        res.json({ message: 'Question deleted' });
    });
});

// Get teacher's exams
app.get('/api/teacher/exams', authenticate, authorize('admin', 'teacher'), (req, res) => {
    const query = req.user.role === 'admin'
        ? `SELECT e.*, u.name as creator_name FROM exams e LEFT JOIN users u ON e.created_by = u.id`
        : `SELECT * FROM exams WHERE created_by = ?`;
    
    const params = req.user.role === 'teacher' ? [req.user.id] : [];
    
    db.all(query, params, (err, exams) => {
        if (err) return res.status(500).json({ message: 'Error fetching exams' });
        res.json(exams);
    });
});

// Create exam
app.post('/api/teacher/exams', authenticate, authorize('admin', 'teacher'), (req, res) => {
    const { title, description, subject, duration, total_marks, passing_marks, scheduled_date, question_ids } = req.body;
    
    db.run(`INSERT INTO exams (title, description, subject, duration, total_marks, passing_marks, scheduled_date, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, description, subject, duration, total_marks, passing_marks, scheduled_date, req.user.id],
        function(err) {
            if (err) return res.status(500).json({ message: 'Error creating exam' });
            
            const examId = this.lastID;
            if (question_ids && question_ids.length > 0) {
                const values = question_ids.map(qid => `(${examId}, ${qid})`).join(', ');
                db.run(`INSERT INTO exam_questions (exam_id, question_id) VALUES ${values}`, [], (err) => {
                    if (err) console.error(err);
                });
            }
            
            res.json({ message: 'Exam created successfully', id: examId });
        }
    );
});

// Get exam submissions
app.get('/api/teacher/exams/:id/submissions', authenticate, authorize('admin', 'teacher'), (req, res) => {
    db.all(`SELECT s.*, u.name as student_name, u.email as student_email 
            FROM submissions s 
            LEFT JOIN users u ON s.student_id = u.id 
            WHERE s.exam_id = ?`,
        [req.params.id], (err, submissions) => {
            if (err) return res.status(500).json({ message: 'Error fetching submissions' });
            res.json(submissions);
        }
    );
});

// Get proctoring logs for monitoring
app.get('/api/teacher/proctoring/:examId', authenticate, authorize('admin', 'teacher'), (req, res) => {
    db.all(`SELECT p.*, u.name as student_name 
            FROM proctoring_logs p 
            LEFT JOIN users u ON p.student_id = u.id 
            WHERE p.exam_id = ? 
            ORDER BY p.timestamp DESC
            LIMIT 100`,
        [req.params.examId], (err, logs) => {
            if (err) return res.status(500).json({ message: 'Error fetching logs' });
            res.json(logs);
        }
    );
});

// ==================== STUDENT ROUTES ====================

// Get available exams
app.get('/api/student/exams', authenticate, authorize('admin', 'teacher', 'student'), (req, res) => {
    const query = req.user.role === 'student'
        ? `SELECT * FROM exams WHERE status = 'active'`
        : `SELECT * FROM exams`;
    
    db.all(query, [], (err, exams) => {
        if (err) return res.status(500).json({ message: 'Error fetching exams' });
        res.json(exams);
    });
});

// Get exam details with questions
app.get('/api/student/exams/:id', authenticate, (req, res) => {
    db.get(`SELECT * FROM exams WHERE id = ?`, [req.params.id], (err, exam) => {
        if (err || !exam) return res.status(404).json({ message: 'Exam not found' });
        
        db.all(`SELECT q.id, q.question_text, q.question_type, q.options, q.marks 
                FROM exam_questions eq 
                LEFT JOIN questions q ON eq.question_id = q.id 
                WHERE eq.exam_id = ?`,
            [req.params.id], (err, questions) => {
                if (err) return res.status(500).json({ message: 'Error fetching questions' });
                exam.questions = questions.map(q => ({
                    ...q,
                    options: q.options ? JSON.parse(q.options) : []
                }));
                res.json(exam);
            }
        );
    });
});

// Submit exam
app.post('/api/student/exams/:id/submit', authenticate, (req, res) => {
    const { answers } = req.body;
    
    // Validate answers
    if (!answers || typeof answers !== 'object') {
        return res.status(400).json({ message: 'Invalid answers format' });
    }
    
    // Check if student already submitted this exam
    db.get(`SELECT id, status FROM submissions WHERE exam_id = ? AND student_id = ?`, 
        [req.params.id, req.user.id], (err, existingSubmission) => {
            if (err) return res.status(500).json({ message: 'Error checking submission' });
            
            if (existingSubmission) {
                if (existingSubmission.status === 'submitted') {
                    return res.status(400).json({ message: 'You have already submitted this exam' });
                }
            }
            
            // Calculate marks
            db.all(`SELECT q.id, q.correct_answer, q.marks FROM exam_questions eq 
                    LEFT JOIN questions q ON eq.question_id = q.id 
                    WHERE eq.exam_id = ?`,
                [req.params.id], (err, questions) => {
                    if (err) return res.status(500).json({ message: 'Error fetching questions' });
                    
                    if (!questions || questions.length === 0) {
                        return res.status(400).json({ message: 'No questions found for this exam' });
                    }
                    
                    let totalMarks = 0;
                    let obtainedMarks = 0;
                    
                    questions.forEach(q => {
                        totalMarks += q.marks || 0;
                        const studentAnswer = answers[q.id];
                        if (studentAnswer && studentAnswer.toString().trim().toLowerCase() === q.correct_answer.toString().trim().toLowerCase()) {
                            obtainedMarks += q.marks || 0;
                        }
                    });
                    
                    db.run(`INSERT INTO submissions (exam_id, student_id, answers, marks_obtained, status) 
                            VALUES (?, ?, ?, ?, 'submitted')`,
                        [req.params.id, req.user.id, JSON.stringify(answers), obtainedMarks],
                        function(err) {
                            if (err) return res.status(500).json({ message: 'Error submitting exam' });
                            res.json({ message: 'Exam submitted successfully', marks: obtainedMarks, total: totalMarks });
                        }
                    );
                }
            );
        }
    );
});

// Get student results
app.get('/api/student/results', authenticate, (req, res) => {
    const query = req.user.role === 'student'
        ? `SELECT sub.*, e.title, e.subject, e.total_marks, e.passing_marks 
           FROM submissions sub 
           LEFT JOIN exams e ON sub.exam_id = e.id 
           WHERE sub.student_id = ?`
        : `SELECT sub.*, u.name as student_name, e.title, e.subject 
           FROM submissions sub 
           LEFT JOIN exams e ON sub.exam_id = e.id 
           LEFT JOIN users u ON sub.student_id = u.id`;
    
    const params = req.user.role === 'student' ? [req.user.id] : [];
    
    db.all(query, params, (err, results) => {
        if (err) return res.status(500).json({ message: 'Error fetching results' });
        res.json(results);
    });
});

// Update profile
app.put('/api/profile', authenticate, (req, res) => {
    const { name, email } = req.body;
    db.run(`UPDATE users SET name = ?, email = ? WHERE id = ?`, 
        [name, email, req.user.id], (err) => {
            if (err) return res.status(500).json({ message: 'Error updating profile' });
            res.json({ message: 'Profile updated successfully' });
        }
    );
});

// ==================== PROCTORING ROUTES ====================

// Log proctoring event
app.post('/api/proctoring/log', authenticate, (req, res) => {
    const { exam_id, event_type, event_data } = req.body;
    
    db.run(`INSERT INTO proctoring_logs (student_id, exam_id, event_type, event_data) VALUES (?, ?, ?, ?)`,
        [req.user.id, exam_id, event_type, JSON.stringify(event_data)],
        function(err) {
            if (err) return res.status(500).json({ message: 'Error logging event' });
            res.json({ message: 'Event logged' });
        }
    );
});

// Seed admin account (run once)
app.get('/api/seed-admin', (req, res) => {
    const adminEmail = 'uthamanyuvi007@gmail.com';
    const adminName = 'YUVARAJ CHAKKARAVARTHI D';
    const adminPassword = 'YUVARAJ@2006';
    
    // Check if admin already exists
    db.get(`SELECT id FROM users WHERE role = 'admin'`, [], (err, row) => {
        if (err) return res.status(500).json({ message: 'Error checking admin' });
        
        if (row) {
            return res.json({ message: 'Admin already exists' });
        }
        
        // Create admin
        const hashedPassword = bcrypt.hashSync(adminPassword, 10);
        db.run(`INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)`,
            [adminName, adminEmail, hashedPassword, 'admin', 'active'],
            function(err) {
                if (err) return res.status(500).json({ message: 'Error creating admin' });
                res.json({ message: 'Admin created successfully', email: adminEmail });
            }
        );
    });
});

// ==================== PAGE ROUTES ====================

// Serve static files from public folder
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve pages from public folder
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/teacher-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'teacher-dashboard.html'));
});

app.get('/student-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'student-dashboard.html'));
});

app.get('/exams', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'exam-list.html'));
});

app.get('/exam/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'exam-take.html'));
});

app.get('/question-bank', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'question-bank.html'));
});

app.get('/create-exam', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create-exam.html'));
});

app.get('/results', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/monitoring', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'monitoring.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
