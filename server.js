const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

const imageSchema = new mongoose.Schema({
  url: String,
  title: String,
  description: String,
  category: String,
  createdAt: { type: Date, default: Date.now },
});

const Image = mongoose.model('Image', imageSchema);

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

// Routes
app.post('/upload', upload.single('image'), async (req, res) => {
  const { title, description, category } = req.body;
  const newImage = new Image({
    url: `/uploads/${req.file.filename}`,
    title,
    description,
    category, // Assign category
  });

  try {
    await newImage.save();
    res.status(201).json(newImage);
  } catch (error) {
    console.error('Error saving image:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/images', async (req, res) => {
  const images = await Image.find();
  res.json(images);
});

app.delete('/images/:id', async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (image) {
      // Deleting image from database
      await Image.deleteOne({ _id: req.params.id });

      // Sending response to the client
      res.status(204).send();
      
      // Later in the code, you might unintentionally send another response
      res.status(200).json({ message: 'Image deleted successfully' });
    } else {
      res.status(404).send({ error: 'Image not found' });
    }
  } catch (err) {
    console.error('Error deleting image:', err);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

app.use('/uploads', express.static('uploads'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
