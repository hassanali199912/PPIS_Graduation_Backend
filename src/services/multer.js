const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");


/*===============Multer Config=================*/
const uploadDir = path.resolve(process.cwd(), "uploads");

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdir(uploadDir, { recursive: true }, (err) => {
      if (err) return cb(err);
      cb(null, uploadDir);
    });
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  },
});


const multerOptions = {
  storage: fileStorage,
};

const fileUpload = multer(multerOptions);

module.exports = fileUpload;