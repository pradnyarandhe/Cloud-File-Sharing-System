import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import cors from "cors";
import mysql from "mysql2";


const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
app.use(cors());
app.use(express.json());

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
  console.log(req.file);
  const { originalname, mimetype, buffer } = req.file;

  const sql = "INSERT INTO files (file_name, file_type, file_data) VALUES (?, ?, ?)";
  db.query(sql, [originalname, mimetype, buffer], (err, result) => {
    if (err) {
      console.error("Error inserting file into database:", err);
      return res.status(500).json({ error: "Failed to upload file." });
    }
    // Store success message in session
    const successMessage = req.query.success || ""; // Read success message from URL
    res.render("upload.ejs", {files, success: successMessage });
  });
});

// Serve `home.html` when the user visits `/`
app.get("/", (req, res) => {
  res.render("index.ejs")
});

app.get("/upload", (req, res) => {
  const sql = "SELECT id, file_name, upload_time FROM files";
  db.query(sql, (err, files) => {
    if(err){
      console.error("Error Fetching Files:", err);
      return res.status(500).send("Internal Server Error");
    }
  res.render("upload.ejs", {files});
  });
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

// Retrieve File List API
// app.get("/files", (req, res) => {
//   db.query("SELECT id, file_name, file_type, upload_time FROM files", (err, results) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json(results);
//   });
// });

app.get("/upload/:id", (req, res) => {
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


// Start Server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

