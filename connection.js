import mysql from "mysql2";
// const mysql = require("mysql2");  // Use mysql2 instead of mysql

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
    if (err) {
      console.error("Error creating database:", err);
    } else {
      console.log("Database 'file_upload_db' created or already exists.");
    }
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

    //Table for UserLogin
    const createTableForUser = `
    CREATE TABLE IF NOT EXISTS loginuser (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_name VARCHAR(255) NOT NULL,
      user_password VARCHAR(50) NOT NULL,
      phoneno varchar(10) NOT NULL, 
      fullname VARCHAR(100) NOT NULL
    );
    `;
    db.query(createTableForUser, (err, result) => {
      if (err) {
        console.error("Error creating table:", err);
      } else {
        console.log("Table 'loginuser' created successfully!");
      }

    });

    const createTableLinks = ` 
CREATE TABLE IF NOT EXISTS public_links (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hash VARCHAR(255) UNIQUE NOT NULL,
    file_id INT NOT NULL,
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES loginuser(id) ON DELETE CASCADE
);
`;


    db.query(createTableLinks, (err, result) => {
      if (err) {
        console.error("Error creating 'public_links' table:", err);
      } else {
        console.log("✅ Table 'public_links' created successfully!");
      }
    });

    db.end(); // Close the database connection
  });
});