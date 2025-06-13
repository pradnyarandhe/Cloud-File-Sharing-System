import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import cors from "cors";
import mysql from "mysql2";
import session from "express-session";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";


const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.set("view engine", "ejs");
app.set("views", "./views"); // Ensure the 'views' folder is set correctly

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());


app.use(session({
  secret: "nimbusdrive_secret",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));



// MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "file_upload_db",
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error("Database Connection Failed!", err);
    return;
  }
  console.log("Connected to MySQL Database!");
});


app.post("/upload", upload.single("file_name"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const { originalname, mimetype, buffer } = req.file;
  const sql = "INSERT INTO files (file_name, file_type, file_data) VALUES (?, ?, ?)";

  db.query(sql, [originalname, mimetype, buffer], (err, result) => {
    if (err) {
      console.error("Error saving file:", err);
      return res.status(500).send("File upload failed.");
    }

    // Store success message in session
    req.session.success = "File uploaded successfully!";
    res.redirect("/upload");
  });
});


// Serve `home.html` when the user visits `/`
app.get("/", (req, res) => {
  res.render("index.ejs")
});

app.get("/upload", (req, res) => {
  const sql = "SELECT id, file_name, upload_time FROM files";
  db.query(sql, (err, files) => {
    if (err) {
      console.error("Error Fetching Files:", err);
      return res.status(500).send("Internal Server Error");
    }
    // Retrieve success message and clear session
    const successMessage = req.session.success;
    req.session.success = null;

    res.render("upload", { files, success: successMessage });
  });
});


// Route: Upload file & generate share link
app.post("/upload/share:id", async (req, res) => {
  const fileId = req.params.id;
  const userId = req.session.user_id; // Get logged-in user

  if (!userId) {
    req.session.error = "Please log in to share files.";
    return res.redirect("/login");
  }

  // Check if the file exists
  const fileSql = "SELECT * FROM files WHERE id = ?";
  db.query(fileSql, [fileId], async (err, result) => {
    if (err || result.length === 0) {
      req.session.error = "File does not exist.";
      return res.redirect("/upload");
    }

    const file = result[0];

    // Generate unique hash for the file link
    bcrypt.hash(file.file_name, 10, async (error, hash) => {
      if (error) {
        req.session.error = "Error generating link.";
        return res.redirect("/upload");
      }

      hash = hash.substring(10, 20);
      const shareLink = `http://localhost:5000/upload/share/${hash}`;

      // Save the link to MySQL
      const linkSql = `
          INSERT INTO public_links (hash, file_id, uploaded_by) 
          VALUES (?, ?, ?)
      `;
      db.query(linkSql, [hash, fileId, userId], (err) => {
        if (err) {
          req.session.error = "Error saving share link.";
          return res.redirect("/upload");
        }

        req.session.success = `Share link generated: ${shareLink}`;
        return res.redirect("/upload");
      });
    });
  });
});

// Route: Serve uploaded file via generated link
app.get("/upload/share/:hash", (req, res) => {
  const fileHash = req.params.hash;

  const sql = `
      SELECT f.file_name, f.file_type, f.file_data 
      FROM public_links pl
      JOIN files f ON pl.file_id = f.id
      WHERE pl.hash = ?
  `;

  db.query(sql, [fileHash], (err, result) => {
    if (err || result.length === 0) {
      return res.status(404).send("File not found or link expired.");
    }

    const file = result[0];

    // Serve the file as a download
    res.setHeader("Content-Type", file.file_type);
    res.setHeader("Content-Disposition", `attachment; filename="${file.file_name}"`);
    res.send(file.file_data);
  });
});

// Route: Upload Page (Displays Success Message)
app.get("/upload", (req, res) => {
  const successMsg = req.session.success;
  req.session.success = null; // Clear message after displaying
  res.render("upload", { success: successMsg });
});



app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;  // Extract fields properly

  if (!email || !password) {
    req.session.error = "Email and Password are required.";
    return res.redirect("/login");
  }

  const sql = "SELECT * FROM loginuser WHERE user_name = ? AND user_password = ?";
  db.query(sql, [email, password], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      req.session.error = "Internal Server Error";
      return res.redirect("/login");
    }

    if (results.length === 0) {
      req.session.error = "Invalid credentials. Please try again.";
      return res.redirect("/login");
    }

    req.session.user_id = results[0].id; // Store user ID in session
    req.session.success = "Login successful!";
    res.redirect("/upload");
  });
});


app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});


app.post("/signup", (req, res) => {
  const { email, password, phoneno, fullname } = req.body;

  if (!email || !password || !phoneno || !fullname) {
    req.session.error = "All fields are required!";
    return res.redirect("/signup");
  }

  const sql = "INSERT INTO loginuser (user_name, user_password, phoneno, fullname) VALUES (?, ?, ?, ?)";
  db.query(sql, [email, password, phoneno, fullname], (err, result) => {
    if (err) {
      console.error("MySQL Insert Error:", err);
      req.session.error = "Database error! Unable to register user.";
      return res.redirect("/signup");
    }

    console.log("✅ User registered:", result.insertId);
    req.session.success = "Registration successful! Please log in.";
    res.redirect("/login");
  });
});


// Retrieve File List API
// app.get("/files", (req, res) => {
//   db.query("SELECT id, file_name, file_type, upload_time FROM files", (err, results) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json(results);
//   });
// });

app.get("/upload/download/:id", (req, res) => {
  const fileId = req.params.id; //3
  const sql = "SELECT file_name, file_type, file_data FROM files WHERE id = ?";

  db.query(sql, [fileId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.status(404).json({ message: "File not found" });

    res.setHeader("Content-Type", result[0].file_type);
    res.setHeader("Content-Disposition", `attachment; filename="${result[0].file_name}"`);
    res.send(result[0].file_data);
  });
});


app.post("/delete", (req, res) => {
  const { fileName } = req.body; // Get file name from request

  if (!fileName) {
    return res.status(400).json({ error: "No file name provided." });
  }

  const sql = "DELETE FROM files WHERE file_name = ?";

  db.query(sql, [fileName], (err, result) => {
    if (err) {
      console.error("Error deleting file:", err);
      return res.status(500).json({ error: "Failed to delete file" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    console.log("File deleted:", fileName);
    req.session.success = "File deleted successfully!";
    //res.render("/upload");
    res.json({ message: "File deleted successfully" });
  });
});



// Start Server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

