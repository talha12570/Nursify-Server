const express=require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth-middleware");
const   validator=require("../validators/auth-validator");
const validate = require("../middleware/validate-middleware");
const authControllers=require("../controllers/auth-controller");
const upload = require("../config/multer");

// Registration route with file upload support
// Fields: cnicFront, cnicBack, licensePhoto, experienceLetter, experienceImage, medicalRecord, professionalImage
router.route("/register").post(
  upload.fields([
    { name: 'cnicFront', maxCount: 1 },
    { name: 'cnicBack', maxCount: 1 },
    { name: 'licensePhoto', maxCount: 1 },
    { name: 'experienceLetter', maxCount: 1 },
    { name: 'experienceImage', maxCount: 1 },
    { name: 'medicalRecord', maxCount: 1 },
    { name: 'professionalImage', maxCount: 1 }
  ]),
  authControllers.register
);

router.route("/login").post(validate(validator.Login),authControllers.login);
router.route("/user").get(authMiddleware,authControllers.user);
router.route("/forgot-password").post(authControllers.forgotPassword);
router.route("/reset-password").post(authControllers.resetPassword);

module.exports = router;