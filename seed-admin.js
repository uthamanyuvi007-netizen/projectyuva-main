const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./exam_system.db');

// Delete existing users first
db.run('DELETE FROM users', (err) => {
    if (err) {
        console.error('Error clearing users:', err);
        return;
    }
    
    const hashedPassword = bcrypt.hashSync('YUVARAJ@2006', 10);
    
    db.run(
        "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)",
        ['YUVARAJ CHAKKARAVARTHI D', 'uthamanyuvi007@gmail.com', hashedPassword, 'admin', 'active'],
        function(err) {
            if (err) {
                console.error('Error creating admin:', err);
            } else {
                console.log('Admin account created successfully!');
                console.log('Email: uthamanyuvi007@gmail.com');
                console.log('Password: YUVARAJ@2006');
            }
            db.close();
        }
    );
});
