const mysql = require("mysql2");  // Use mysql2 instead of mysql

// Create a MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",         // Change this to your MySQL username
  password: "root", // Change this to your MySQL password
});

// Connect to MySQL Server
db.connect((err) => {
  if (err) {
    console.error("Database Connection Failed!", err);
    return;
  }
  console.log("Connected to MySQL Server!");

  // Create Database
  db.query("CREATE DATABASE IF NOT EXISTS file_upload_db", (err, result) => {
      console.error("Error creating database:", err);
    } else {
      console.log("Database 'file_upload_db' created or already exists.");
  });

  // Switch to the Database
  db.changeUser({ database: "file_upload_db" }, (err) => {
    if (err) {
      console.error("Error selecting database:", err);
      return;
    }
    console.log("Using database 'file_upload_db'");

    // Create Table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_data LONGBLOB NOT NULL,
        upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    db.query(createTableQuery, (err, result) => {
      if (err) {
        console.error("Error creating table:", err);
      } else {
        console.log("Table 'files' created successfully!");
      }
      db.end(); // Close the database connection
    });
  });
});