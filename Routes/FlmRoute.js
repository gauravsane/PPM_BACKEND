const express = require("express");
const { flmRegister, flmLogin, createPlan, updatePlan, deletePlan, updateStatePlan, planDetail, createFeedback, deleteFeedback, updateFeedback,flmProfileData,GetppmFeedback, ppmFeedbackDetail, planStatusDetails, planSavedDetail, planSubmitDetail, feedbackCreateRequireDetail, planRequiredDetail} = require("../Controllers/FlmController");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");


// Multer configuration for file uploads....
const ppmUploadImages = 'uploads';

if (!fs.existsSync(ppmUploadImages)) {
    fs.mkdirSync(ppmUploadImages);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, ppmUploadImages);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });


/******************************************  TLM POST ROUTES ************************************************/
router.post("/register/:id", flmRegister);
router.post("/login", flmLogin);
router.post("/create-plan/:id", createPlan);
router.put('/update-plan/:flmId/:planId', updatePlan);
router.delete("/delete-plan/:flmId/:planId", deletePlan);
router.put('/update-state-plan/:flmId/:planId', updateStatePlan);
router.post("/create-feedback/:id", upload.fields([{ name: 'expenseFiles', maxCount: 10 }, { name: 'eventPhotos', maxCount: 10 }]), createFeedback);
router.delete("/delete-feedback/:flmId/:feedbackId", deleteFeedback);
router.put('/update-feedback/:flmId/:planId',updateFeedback);



/******************************************  TLM GET ROUTES ************************************************/
router.get("/get-plan-detail/:flmId", planDetail);
router.get("/ppmPlan-status-detail/:flmID",planStatusDetails)
router.get("/flmdata/:id", flmProfileData);
router.get("/Feedbackdata/:id", GetppmFeedback);
router.get("/ppmFeedback/:flmId/:feedbackId", ppmFeedbackDetail);
router.get("/plan-saved-detail/:id", planSavedDetail);
router.get("/plan-submit-detail/:id", planSubmitDetail);
router.get("/feedback-create-RequireDetail", feedbackCreateRequireDetail);
router.get("/plan-edit-RequireDetail/:flmId/:planId", planRequiredDetail);






module.exports = router;