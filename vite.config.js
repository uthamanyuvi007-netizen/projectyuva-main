import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.',
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                login: resolve(__dirname, 'login.html'),
                register: resolve(__dirname, 'register.html'),
                admin: resolve(__dirname, 'admin-dashboard.html'),
                teacher: resolve(__dirname, 'teacher-dashboard.html'),
                student: resolve(__dirname, 'student-dashboard.html'),
                exams: resolve(__dirname, 'exams.html'),
                exam: resolve(__dirname, 'exam.html'),
                questions: resolve(__dirname, 'question-bank.html'),
                createExam: resolve(__dirname, 'create-exam.html'),
                results: resolve(__dirname, 'results.html'),
                profile: resolve(__dirname, 'profile.html'),
                monitoring: resolve(__dirname, 'monitoring.html'),
            },
        },
    },
    server: {
        port: 3000,
    },
});
