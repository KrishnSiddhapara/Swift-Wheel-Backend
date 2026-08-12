const fs = require('fs');
const os = require('os');
const multer = require('multer');
const path = require('path');

const getUploadDir = () => {
  const localPath = path.join(__dirname, '../uploads');
  try {
    if (!fs.existsSync(localPath)) {
      fs.mkdirSync(localPath, { recursive: true });
    }
    const testFile = path.join(localPath, '.write_test_' + Date.now());
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return localPath;
  } catch (err) {
    return os.tmpdir();
  }
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, getUploadDir());
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const checkFileType = (file, cb) => {
  const filetypes = /jpg|jpeg|png|pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype) || file.mimetype === 'application/pdf';

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Images and PDFs only!'));
  }
};

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
});

module.exports = upload;
