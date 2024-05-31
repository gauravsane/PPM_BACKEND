const slmModel = require("../Models/SlmModel");
const flmModel = require("../Models/FlmModel");
const jwt = require("jsonwebtoken");
const cron = require("node-cron");
const moment = require("moment");
const mongoose = require("mongoose");


//Register Controller....
const flmRegister = async (req, res) => {
    try {
        //Check slm exist or not....
        const slmID = req.params.id;
        const slmExist = await slmModel.findById(slmID);
        if (!slmExist) {
            return res.status(404).send({ message: "Slm not found..!!", success: false });
        }

        //Handle new tlm data...
        const { flmID, flmNAME, flmPASSWORD, flmGENDER, flmNUMBER, HQ, area, region, zone } = req.body;

        //Check flm exist or not...
        const flmExist = await flmModel.findOne({ flmId: flmID });
        if (flmExist) {
            return res.status(501).send({ message: "Flm already exist..!!", success: false });
        }

        //Formated data before store....
        const formatedData = {
            flmId: flmID,
            flmName: flmNAME,
            flmPassword: flmPASSWORD,
            flmGender: flmGENDER,
            flmNumber: flmNUMBER,
            HQ: HQ,
            area: area,
            region: region,
            zone: zone
        }

        //Save new flm entry in database....
        const newFlm = new flmModel(formatedData);
        await newFlm.save();

        //Store new flm id to slm model...
        slmExist.FLM.push(newFlm._id);
        await slmExist.save();

        res.status(201).send({ message: "New Flm register successfully..", success: true });

    } catch (err) {
        console.log(err);
        res.status(501).send({ message: "Failed to register new tlm...!!", success: false });
    }
}

//Login Controller....
const flmLogin = async (req, res) => {
    try {
        const { ID, PASSWORD } = req.body;

        //Check the admin Exist or not..
        const flmExist = await flmModel.findOne({ flmId: ID });
        if (!flmExist) {
            return res.status(404).send({ message: "FLM Not Exist...!!!", success: false });
        }

        //Check the password length...
        if (PASSWORD.length < 5) {
            return res.status(500).send({ message: "Password length must be greater than 5 letter..!!!", success: false });
        }

        //Check the password match or not...
        if (flmExist.flmPassword !== PASSWORD) {
            return res.status(500).send({ message: "Invalid Credentials Failed to login..!!", success: false });
        }

        //Generate token after login...
        const token = jwt.sign({ id: flmExist._id }, process.env.SECRETKEY, {
            expiresIn: "1d"
        });

        const flmId = flmExist._id;

        //Final all ok give response..
        res.status(201).send({ message: "Flm Successfully Login...", success: true, token, flmExist, flmId });

    } catch (err) {
        console.log(err);
        res.status(501).send({ message: "Failed to login slm...!!!", success: false });
    }
}

//Create Planned....
const createPlan = async (req, res) => {
    try {
        const flmId = req.params.id;
        const { ppmDate, speakerName, scCode, doctorSpec, place, noOfAttedance, venueName, brandName, hotelReqSendDate, paymentMode, advanceReqDate, ppmCost,ppmModeStatus } = req.body;


        //Check flm exist or not...
        const flmExist = await flmModel.findById(flmId);
        if (!flmExist) {
            return res.status(501).send({ message: "Flm not found..!!", success: false });
        }

        //Configure planned status track saved || submit....
        const allFieldsPresent = ppmDate && speakerName && scCode && doctorSpec && place && noOfAttedance && venueName && brandName && hotelReqSendDate && paymentMode && advanceReqDate && ppmCost;

        // Set ppmStatus based on the presence of all fields
        const statusCheck = allFieldsPresent ? true : false;


        //Formated planned data...
        const formatedData = {
            ppmDate: ppmDate,
            speakerName: speakerName,
            scCode: scCode,
            doctorSpec: doctorSpec,
            place: place,
            noOfAttedance: noOfAttedance,
            venueName: venueName,
            brandName: brandName,
            hotelReqSendDate: hotelReqSendDate,
            paymentMode: paymentMode,
            advanceReqDate: advanceReqDate,
            ppmCost: ppmCost,
            ppmStatus: statusCheck,
            ppmModeStatus: ppmModeStatus
        }


        //Save new flm plan...
        flmExist.ppmPlanning.push(formatedData);
        await flmExist.save();

        res.status(201).send({ message: "New FLM plan create successfully..", success: true });


    } catch (err) {
        console.log(err);
        res.status(501).send({ message: "Failed to create plan...!!", success: false });
    }
}

//Get plan detail to update plan using planId....
const planRequiredDetail = async (req, res) => {
    try{
        const flmId = req.params.flmId;
        const planId = req.params.planId;

        //Check flm exist or not...
        const flmExist = await flmModel.findById(flmId);
        if (!flmExist) {
            return res.status(404).send({ message: "Flm not found..!!!", success: false });
        }

        // Check if the plan exists
        const planExist = flmExist.ppmPlanning.id(planId);
        if (!planExist) {
            return res.status(404).send({ message: "Plan not found..!!!", success: false });
        }

        res.json(planExist);

    } catch (err) {
        console.log(err);
        res.status(501).send({ message: "Failed to load requierd details..!!!", success: false });
    }
}

//Update already created ppmPlanning plan...
const updatePlan = async (req, res) => {
    try {
        const flmId = req.params.flmId;
        const planId = req.params.planId;
        const { ppmDate, speakerName, scCode, doctorSpec, place, noOfAttedance, venueName, brandName, hotelReqSendDate, paymentMode, advanceReqDate, ppmCost, statusCheck,ppmModeStatus } = req.body;

        // Check if FLM exists
        const flmExist = await flmModel.findById(flmId);
        if (!flmExist) {
            return res.status(404).send({ message: "FLM not found", success: false });
        }

        // Find the plan to update
        const plan = flmExist.ppmPlanning.id(planId);
        if (!plan) {
            return res.status(404).send({ message: "Plan not found", success: false });
        }

        // Update ppmModifiedDate with current date in "dd-mm-yyyy" format....
        const currentDate = new Date();
        const day = currentDate.getDate().toString().padStart(2, '0');
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const year = currentDate.getFullYear();


        // Update the plan with the new data
        plan.ppmDate = ppmDate || plan.ppmDate;
        plan.speakerName = speakerName || plan.speakerName;
        plan.scCode = scCode || plan.scCode;
        plan.doctorSpec = doctorSpec || plan.doctorSpec;
        plan.place = place || plan.place;
        plan.noOfAttedance = noOfAttedance || plan.noOfAttedance;
        plan.venueName = venueName || plan.venueName;
        plan.brandName = brandName || plan.brandName;
        plan.hotelReqSendDate = hotelReqSendDate || plan.hotelReqSendDate;
        plan.paymentMode = paymentMode || plan.paymentMode;
        plan.advanceReqDate = advanceReqDate || plan.advanceReqDate;
        plan.ppmCost = ppmCost || plan.ppmCost;    
        plan.ppmModeStatus = ppmModeStatus || plan.ppmModeStatus;    
        plan.ppmStatus = statusCheck !== undefined ? statusCheck : plan.ppmStatus;
        plan.ppmModifiedDate = `${day}-${month}-${year}`;

        // Save the updated FLM entity
        await flmExist.save();

        res.status(200).send({ message: "Plan updated successfully", success: true });
    } catch (err) {
        console.log(err);
        res.status(500).send({ message: "Failed to update plan", success: false });
    }
}

//Delete planned....
const deletePlan = async (req, res) => {
    try {
        const flmId = req.params.flmId;
        const planId = req.params.planId;

        //Check flm exist or not...
        const flmExist = await flmModel.findById(flmId);
        if (!flmExist) {
            return res.status(404).send({ message: "Flm not found..!!!", success: false });
        }

        // Check if the plan exists
        const planExist = flmExist.ppmPlanning.id(planId);
        if (!planExist) {
            return res.status(404).send({ message: "Plan not found..!!!", success: false });
        }

        // Remove the plan using pull method
        flmExist.ppmPlanning.pull(planId);

        // Save the updated FLM entity....
        await flmExist.save();

        res.status(200).send({ message: "Plan deleted successfully..", success: true });

    } catch (err) {
        console.log(err);
        res.status(501).send({ message: "Failed to delete ppm plan..!!", success: false });
    }
}

//After certain date PPM plan moved from ppmPlanning -----> ppmState...
const planMigration = async () => {
    try {

        // Get current date in dd-mm-yyyy format
        const currentDate = moment().format('DD-MM-YYYY');

        // Get all plan...
        const flms = await flmModel.find();

        for (const flm of flms) {
            // Filter plans with the current date...
            const plansToMove = flm.ppmPlanning.filter(plan => plan.ppmDate === currentDate);

            if (plansToMove.length > 0) {

                // Move the plans to ppmState...
                flm.ppmState.push(...plansToMove);

                // Remove the plans from ppmPlanning....
                flm.ppmPlanning = flm.ppmPlanning.filter(plan => plan.ppmDate !== currentDate);

                // Save the updated FLM entity...
                await flm.save();

                console.log(`Moved ${plansToMove.length} plans for FLM ID ${flm._id}`);
            }
        }
    } catch (err) {
        console.error("Error moving plans:", err);
    }
};
// Schedule the job to run every 20 seconds
cron.schedule("*/20 * * * * *", planMigration);

//Update ppmState plan....
const updateStatePlan = async (req, res) => {
    try {
        const flmId = req.params.flmId;
        const planId = req.params.planId;
        const { ppmDate, speakerName, scCode, doctorSpec, place, noOfAttedance, venueName, brandName, hotelReqSendDate, paymentMode, advanceReqDate, ppmCost, ppmPlanStatus, ppmPlanScheduleDate, statusCheck } = req.body;

        // Check if FLM exists
        const flmExist = await flmModel.findById(flmId);
        if (!flmExist) {
            return res.status(404).send({ message: "FLM not found", success: false });
        }

        // Update ppmModifiedDate with current date in "dd-mm-yyyy" format....
        const currentDate = new Date();
        const day = currentDate.getDate().toString().padStart(2, '0');
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const year = currentDate.getFullYear();


        // Find the plan to update
        let planIndex = -1;
        flmExist.ppmState.forEach((plan, index) => {
            if (plan._id.toString() === planId) {
                planIndex = index;
            }
        });

        if (planIndex === -1) {
            return res.status(404).send({ message: "Plan not found", success: false });
        }

        // Update the plan with the new data
        const planToUpdate = flmExist.ppmState[planIndex];
        planToUpdate.ppmDate = ppmDate || planToUpdate.ppmDate;
        planToUpdate.speakerName = speakerName || plan.speakerName;
        planToUpdate.scCode = scCode || planToUpdate.scCode;
        planToUpdate.doctorSpec = doctorSpec || planToUpdate.doctorSpec;
        planToUpdate.place = place || planToUpdate.place;
        planToUpdate.noOfAttedance = noOfAttedance || planToUpdate.noOfAttedance;
        planToUpdate.venueName = venueName || planToUpdate.venueName;
        planToUpdate.brandName = brandName || planToUpdate.brandName;
        planToUpdate.hotelReqSendDate = hotelReqSendDate || planToUpdate.hotelReqSendDate;
        planToUpdate.paymentMode = paymentMode || planToUpdate.paymentMode;
        planToUpdate.advanceReqDate = advanceReqDate || planToUpdate.advanceReqDate;
        planToUpdate.ppmCost = ppmCost || planToUpdate.ppmCost;
        planToUpdate.ppmPlanStatus = ppmPlanStatus || planToUpdate.ppmPlanStatus;
        planToUpdate.ppmStatus = statusCheck !== undefined ? statusCheck : planToUpdate.ppmStatus;
        planToUpdate.ppmModifiedDate = `${day}-${month}-${year}`;

        // Use markModified for nested objects or arrays
        flmExist.markModified('ppmState');

        //If ppmSheduled status is postponed push -----> ppmPlanning...
        if (ppmPlanStatus === 'Postponed') {
            const postponedPlan = { ...planToUpdate, ppmDate: ppmPlanScheduleDate };
            flmExist.ppmPlanning.push(postponedPlan);
        }

        // Save the updated FLM entity...
        await flmExist.save();

        res.status(200).send({ message: "State Plan updated successfully", success: true });
    } catch (err) {
        console.log(err);
        res.status(500).send({ message: "Failed to update State plan", success: false });
    }
}

//Get plan details(ppmPlanning)....
const planDetail = async (req, res) => {
    try {
        const flmId = req.params.flmId;

        //Check flm exist or not....
        const flmExist = await flmModel.findById(flmId);
        if (!flmExist) {
            return res.status(404).send({ message: "Flm not found..!!", success: false });
        }

        //Loop data to store....
        const planReportDetail = [];

        //Iterate plan detail....
        for (plan of flmExist.ppmPlanning) {
            const data = {
                planId: plan._id,
                PPMDATE: plan.ppmDate,
                PPMSPK: plan.speakerName,
                PPMSCODE: plan.scCode,
                PPMSPEC: plan.doctorSpec,
                PPMPLACE: plan.place,
                PPMATTEDANCE: plan.noOfAttedance,
                PPMVNAME: plan.venueName,
                PPMBNAME: plan.brandName,
                PPMHOTELREQDATE: plan.hotelReqSendDate,
                PPMPMODE: plan.paymentMode,
                PPMADVREQDATE: plan.advanceReqDate,
                PPMCOST: plan.ppmCost,
                PPMSTATUS: plan.ppmStatus?'complete':'incomplete',
                PPMMODESTATUS: plan.ppmModeStatus,
                PPMPLANSTATUS: plan.ppmPlanStatus,
                PPMMDFDATE: plan.ppmModifiedDate,
            }
            planReportDetail.push(data);
        }

        res.status(201).json(planReportDetail);
    } catch (err) {
        console.log(err);
        res.status(501).send({ message: "Failed to fetch plan details..!!!", success: false });
    }
}

//create Feedback working code...
// const createFeedback = async (req, res) => {
//     try {
//         const flmId = req.params.id; // Assuming you're passing flmId in the URL
 
//         console.log("REQ BODY", req.body);
//         console.log("REQ FILES", req.files);

//          // Find the Flm document by flmId
//         const flm = await flmModel.findById(flmId);
//         if (!flm) {
//             return res.status(404).json({ error: 'Flm not found' });
//         }
 
 
//         // Initialize expensesWithBills array
//         const expensesWithBills = [];
 
//         // Loop through each key in req.body
//         Object.keys(req.body).forEach(key => {
//             // Check if the key starts with 'expensesWithBills'
//             if (key.startsWith('expensesWithBills')) {
//                 // Extract the index from the key
//                 const index = parseInt(key.match(/\d+/)[0]);
 
//                 // Extract the property name from the key
//                 const propertyName = key.split('.')[1];
 
//                 // Check if the index exists in the expensesWithBills array
//                 if (!expensesWithBills[index]) {
//                     expensesWithBills[index] = {};
//                 }
 
//                 // Set the value in the expensesWithBills array
//                 expensesWithBills[index][propertyName] = req.body[key];
//             }
//         });
 
//         console.log("expensesWithBills", expensesWithBills); // Verify expensesWithBills
 
//         // Process attedanceList from req.body
//         const attedanceList = [];
//         const attedanceKeys = Object.keys(req.body).filter(key => key.startsWith('attedanceList'));
 
//         attedanceKeys.forEach(key => {
//             // Extract the index from the key
//             const index = parseInt(key.match(/\d+/)[0]);
 
//             // Extract the property name from the key
//             const propertyName = key.split('.')[1];
 
//             // Check if the index exists in the attedanceList array
//             if (!attedanceList[index]) {
//                 attedanceList[index] = {};
//             }
 
//             // Set the value in the attedanceList array
//             attedanceList[index][propertyName] = req.body[key];
//         });
 
//         console.log("attedanceList", attedanceList); // Verify attedanceList
 
//         // Construct the ppmFeedback object from request body
//         const ppmFeedback = {
//             planMode: req.body.planMode,
//             plannedDate: req.body.plannedDate,
//             plannedSpkName: req.body.plannedSpkName,
//             accPPMDate: req.body.accPPMDate,
//             accSpkName: req.body.accSpkName,
//             scCode: req.body.scCode,
//             doctorSpec: req.body.doctorSpec,
//             place: req.body.place,
//             noOfAttedance: req.body.noOfAttedance,
//             venueName: req.body.venueName,
//             brandName: req.body.brandName,
//             topic: req.body.topic,
//             highlight: req.body.highlight,
//             totalExpenses: req.body.totalExpenses,
//             advanceReceive: req.body.advanceReceive,
//             addAmount: req.body.addAmount,
//             expensesWithoutBills: req.body.expensesWithoutBills,
//             // expensesWithBills: expensesWithBills, // Set expensesWithBills array
//             expensesWithBills: expensesWithBills.map((expense, index) => ({
//                 ...expense,
//                 expenseFile: req.files['expenseFiles'][index].path // Storing the path of the uploaded file
//             })),
//             eventPhotos: [], // Initialize eventPhotos array
//             attedanceList // Add attedanceList array
//         };
 
//         console.log("ppmFeedback", ppmFeedback); // Verify ppmFeedback
 
//         // Adding eventPhotos to ppmFeedback object
//         if (req.files && req.files['eventPhotos']) {
//             req.files['eventPhotos'].forEach(file => {
//                 ppmFeedback.eventPhotos.push({
//                     fileName: file.path // Storing the path of the uploaded file
//                 });
//             });
//         }

//         // Add ppmFeedback to the Flm document
//         flm.ppmFeedback.push(ppmFeedback);
 
//         // Save the Flm document
//         await flm.save();
 
//         res.status(201).json({ message: 'Feedback created successfully', feedback: ppmFeedback });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// }

//Create feedback api...
const createFeedback = async (req, res) => {
    try {
        const flmId = req.params.id; // Assuming you're passing flmId in the URL
        console.log("req body :",req.body);

        // Find the Flm document by flmId
        const flm = await flmModel.findById(flmId);
        if (!flm) {
            return res.status(404).json({ error: 'Flm not found' });
        }

        // Initialize expensesWithBills array
        const expensesWithBills = [];

        // Loop through each key in req.body
        Object.keys(req.body).forEach(key => {
            if (key.startsWith('expensesWithBills')) {
                const index = parseInt(key.match(/\d+/)[0]);
                const propertyName = key.split('.')[1];
                if (!expensesWithBills[index]) {
                    expensesWithBills[index] = {};
                }
                expensesWithBills[index][propertyName] = req.body[key];
            }
        });
        console.log("expensesWithBills", expensesWithBills);

        // Process attedanceList from req.body
        const attedanceList = [];
        const attedanceKeys = Object.keys(req.body).filter(key => key.startsWith('attedanceList'));
        attedanceKeys.forEach(key => {
            const index = parseInt(key.match(/\d+/)[0]);
            const propertyName = key.split('.')[1];
            if (!attedanceList[index]) {
                attedanceList[index] = {};
            }
            attedanceList[index][propertyName] = req.body[key];
        });
        console.log("attedanceList", attedanceList);

        // Initialize eventPhotos array
        const eventPhotos = [];
        if (req.files && req.files['eventPhotos']) {
            req.files['eventPhotos'].forEach(file => {
                eventPhotos.push({
                    fileName: file.path // Storing the path of the uploaded file
                });
            });
        }
        console.log("eventPhotos", eventPhotos);

        // Construct the ppmFeedback object from request body
        const ppmFeedback = {
            planMode: req.body.planMode,
            plannedDate: req.body.plannedDate,
            plannedSpkName: req.body.plannedSpkName,
            accPPMDate: req.body.accPPMDate,
            accSpkName: req.body.accSpkName,
            scCode: req.body.scCode,
            doctorSpec: req.body.doctorSpec,
            place: req.body.place,
            noOfAttedance: req.body.noOfAttedance,
            venueName: req.body.venueName,
            brandName: req.body.brandName,
            topic: req.body.topic,
            highlight: req.body.highlight,
            totalExpenses: req.body.totalExpenses,
            advanceReceive: req.body.advanceReceive,
            addAmount: req.body.addAmount,
            expensesWithoutBills: req.body.expensesWithoutBills,
            expensesWithBills: expensesWithBills.map((expense, index) => ({
                ...expense,
                expenseFile: req.files['expenseFiles'][index]?.path // Storing the path of the uploaded file
            })),
            eventPhotos,
            attedanceList,
            DateOfCreation: new Date().toISOString().split('T')[0]
        };
        console.log("ppmFeedback", ppmFeedback);

        // Declare requiredFields variable
        let requiredFields;

        const MODEOFPLAN = req.body.planMode;
        if (MODEOFPLAN === 'Unplanned') {
            // Check if required fields are present and non-empty..
            requiredFields = [
                req.body.planMode,
                req.body.accPPMDate,
                req.body.accSpkName, 
                req.body.scCode,
                req.body.doctorSpec,
                req.body.place, 
                req.body.noOfAttedance,
                req.body.venueName,
                req.body.brandName, 
                req.body.topic,
                req.body.highlight,
                req.body.totalExpenses, 
                req.body.advanceReceive,
                req.body.addAmount,
                req.body.expensesWithoutBills
            ];
        } else {   
            // Check if required fields are present and non-empty..
            requiredFields = [
                req.body.planMode,
                req.body.plannedDate,
                req.body.plannedSpkName,
                req.body.accPPMDate,
                req.body.accSpkName, 
                req.body.scCode,
                req.body.doctorSpec,
                req.body.place, 
                req.body.noOfAttedance,
                req.body.venueName,
                req.body.brandName, 
                req.body.topic,
                req.body.highlight,
                req.body.totalExpenses, 
                req.body.advanceReceive,
                req.body.addAmount,
                req.body.expensesWithoutBills,
            ];
        }

        // Check if each expense with bills is valid...
        const expensesWithBillsValid = expensesWithBills.length > 0 && expensesWithBills.every(expense => 
            Object.values(expense).every(field => field !== undefined && field !== null && field !== '')
        );

        // Check if each attendee is valid...
        const attendanceListValid = attedanceList.length > 0 && attedanceList.every(attendee => 
            Object.values(attendee).every(field => field !== undefined && field !== null && field !== '')
        );

        // Check if eventPhotos is valid...
        const eventPhotosValid = eventPhotos.length > 0;

        // Check all json fields....
        const allFieldsPresent = requiredFields.every(field => field !== undefined && field !== null && field !== '');

        // Console to check all coming field....
        console.log("data :", requiredFields);
        console.log("allFieldsPresentStatus :", allFieldsPresent);
        console.log("expensesWithBillsValidStatus :", expensesWithBillsValid);
        console.log("attendanceListValidStatus :", attendanceListValid);
        console.log("eventPhotosValidStatus :", eventPhotosValid);
        
        // Set ppmStatus based on the presence of all fields
        ppmFeedback.ppmStatus = allFieldsPresent && expensesWithBillsValid && attendanceListValid && eventPhotosValid;

        //Saved ppmFeedbackStatus based on button click....
        const valueCode = req.body.statusValue;
        ppmFeedback.ppmFeedbackStatus = valueCode;

        // Add ppmFeedback to the Flm document
        flm.ppmFeedback.push(ppmFeedback);

        // Save the Flm document
        await flm.save();

        res.status(201).json({ message: 'Feedback created successfully', feedback: ppmFeedback });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

//status page plan date and spkName for createFeedback dropdDown api...
const feedbackCreateRequireDetail = async (req, res) => {
    try {
        //Get all flm users...
        const allFlmData = await flmModel.find({});
        console.log(allFlmData);

        // Extract ppmDate and speakerName from each plan in ppmState for all users
        const ppmDetails = allFlmData.flatMap(flm => 
            flm.ppmState.map(plan => ({
                ppmDate: plan.ppmDate,
                speakerName: plan.speakerName
            }))
        );

        res.json(ppmDetails);
    } catch (err) {
        console.log(err);
        res.status(501).send({ message: "Failed to load date and speakerName..!!", success: false });
    }
}

//Update feedback api..
const updateFeedback = async (req, res) => {
    try {
        const flmId = req.params.flmId;
        const feedbackId = req.params.feedbackId;
        console.log("req body:", req.body);

        // Find the Flm document by flmId
        const flm = await flmModel.findById(flmId);
        if (!flm) {
            return res.status(404).json({ error: 'Flm not found' });
        }

        // Find the feedback by feedbackId
        const feedbackIndex = flm.ppmFeedback.findIndex(feedback => feedback._id.toString() === feedbackId);
        if (feedbackIndex === -1) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        // Initialize expensesWithBills array
        const expensesWithBills = [];

        // Loop through each key in req.body
        Object.keys(req.body).forEach(key => {
            if (key.startsWith('expensesWithBills')) {
                const index = parseInt(key.match(/\d+/)[0]);
                const propertyName = key.split('.')[1];
                if (!expensesWithBills[index]) {
                    expensesWithBills[index] = {};
                }
                expensesWithBills[index][propertyName] = req.body[key];
            }
        });
        console.log("expensesWithBills", expensesWithBills);

        // Process attedanceList from req.body
        const attedanceList = [];
        const attedanceKeys = Object.keys(req.body).filter(key => key.startsWith('attedanceList'));
        attedanceKeys.forEach(key => {
            const index = parseInt(key.match(/\d+/)[0]);
            const propertyName = key.split('.')[1];
            if (!attedanceList[index]) {
                attedanceList[index] = {};
            }
            attedanceList[index][propertyName] = req.body[key];
        });
        console.log("attedanceList", attedanceList);

        // Initialize eventPhotos array
        const eventPhotos = [];
        if (req.files && req.files['eventPhotos']) {
            req.files['eventPhotos'].forEach(file => {
                eventPhotos.push({
                    fileName: file.path // Storing the path of the uploaded file
                });
            });
        }
        console.log("eventPhotos", eventPhotos);

        // Construct the updated ppmFeedback object from request body
        const updatedPpmFeedback = {
            planMode: req.body.planMode,
            plannedDate: req.body.plannedDate,
            plannedSpkName: req.body.plannedSpkName,
            accPPMDate: req.body.accPPMDate,
            accSpkName: req.body.accSpkName,
            scCode: req.body.scCode,
            doctorSpec: req.body.doctorSpec,
            place: req.body.place,
            noOfAttedance: req.body.noOfAttedance,
            venueName: req.body.venueName,
            brandName: req.body.brandName,
            topic: req.body.topic,
            highlight: req.body.highlight,
            totalExpenses: req.body.totalExpenses,
            advanceReceive: req.body.advanceReceive,
            addAmount: req.body.addAmount,
            expensesWithoutBills: req.body.expensesWithoutBills,
            expensesWithBills: expensesWithBills.map((expense, index) => ({
                ...expense,
                expenseFile: req.files['expenseFiles'][index]?.path // Storing the path of the uploaded file
            })),
            eventPhotos,
            attedanceList,
            DateOfCreation: new Date().toISOString().split('T')[0]
        };
        console.log("updatedPpmFeedback", updatedPpmFeedback);

        // Declare requiredFields variable
        let requiredFields;

        const MODEOFPLAN = req.body.planMode;
        if (MODEOFPLAN === 'Unplanned') {
            // Check if required fields are present and non-empty..
            requiredFields = [
                req.body.planMode,
                req.body.accPPMDate,
                req.body.accSpkName, 
                req.body.scCode,
                req.body.doctorSpec,
                req.body.place, 
                req.body.noOfAttedance,
                req.body.venueName,
                req.body.brandName, 
                req.body.topic,
                req.body.highlight,
                req.body.totalExpenses, 
                req.body.advanceReceive,
                req.body.addAmount,
                req.body.expensesWithoutBills
            ];
        } else {   
            // Check if required fields are present and non-empty..
            requiredFields = [
                req.body.planMode,
                req.body.plannedDate,
                req.body.plannedSpkName,
                req.body.accPPMDate,
                req.body.accSpkName, 
                req.body.scCode,
                req.body.doctorSpec,
                req.body.place, 
                req.body.noOfAttedance,
                req.body.venueName,
                req.body.brandName, 
                req.body.topic,
                req.body.highlight,
                req.body.totalExpenses, 
                req.body.advanceReceive,
                req.body.addAmount,
                req.body.expensesWithoutBills,
            ];
        }

        // Check if each expense with bills is valid...
        const expensesWithBillsValid = expensesWithBills.length > 0 && expensesWithBills.every(expense => 
            Object.values(expense).every(field => field !== undefined && field !== null && field !== '')
        );

        // Check if each attendee is valid...
        const attendanceListValid = attedanceList.length > 0 && attedanceList.every(attendee => 
            Object.values(attendee).every(field => field !== undefined && field !== null && field !== '')
        );

        // Check if eventPhotos is valid...
        const eventPhotosValid = eventPhotos.length > 0;

        // Check all json fields....
        const allFieldsPresent = requiredFields.every(field => field !== undefined && field !== null && field !== '');

        // Console to check all coming field....
        console.log("data :", requiredFields);
        console.log("allFieldsPresentStatus :", allFieldsPresent);
        console.log("expensesWithBillsValidStatus :", expensesWithBillsValid);
        console.log("attendanceListValidStatus :", attendanceListValid);
        console.log("eventPhotosValidStatus :", eventPhotosValid);

        // Set ppmStatus based on the presence of all fields
        updatedPpmFeedback.ppmStatus = allFieldsPresent && expensesWithBillsValid && attendanceListValid && eventPhotosValid;

        // Saved ppmFeedbackStatus based on button click....
        const valueCode = req.body.statusValue;
        updatedPpmFeedback.ppmFeedbackStatus = valueCode;

        // Update the existing ppmFeedback in the Flm document
        flm.ppmFeedback[feedbackIndex] = updatedPpmFeedback;

        // Save the Flm document
        await flm.save();

        res.status(200).json({ message: 'Feedback updated successfully', feedback: updatedPpmFeedback });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

//Delete feedback api...
const deleteFeedback = async (req, res) => {
    try {
        const flmId = req.params.flmId;
        const feedbackId = req.params.feedbackId;

        //Check flm exist or not...
        const flmExist = await flmModel.findById(flmId);
        if (!flmExist) {
            return res.status(404).send({ message: "Flm not found..!!!", success: false });
        }

        // Check if the feedback exists
        const feedbackExist = flmExist.ppmFeedback.id(feedbackId);
        if (!feedbackExist) {
            return res.status(404).send({ message: "Feedback not found..!!!", success: false });
        }

        // Remove the plan using pull method
        flmExist.ppmFeedback.pull(feedbackId);

        // Save the updated FLM entity....
        await flmExist.save();

        res.status(200).send({ message: "Feedback deleted successfully..", success: true });
    } catch (err) {
        res.status(501).send({ message: "Failed to delete feedback...!!", success: false });
    }
}

// const flmProfileData = async (req, res) => {
//     try {
//         console.log("req Body: ", req.body);
//         const flmId = req.params.id;
 
//         // Fetch FLM data with only the required fields.....
//         const flmData = await flmModel.findById(flmId).select('HQ area flmNumber flmName flmId flmEmail region zone');
//         if (!flmData) {
//             return res.status(404).send({ message: "Flm not found..!!", success: false });
//         }
//         console.log("flmData: ", flmData);
 
//         // Find the SLM that references the FLM
//         const slmData = await slmModel.findOne({ FLM: flmId }).populate('FLM', 'slmName');
//         if (!slmData) {
//             return res.status(404).send({ message: "SLM not found for the given FLM..!!", success: false });
//         }
//         console.log("slmData: ", slmData);
 
//         // Combine the FLM data with the SLM name
//         const result = {
//             ...flmData._doc,
//             slmName: slmData.slmName
//         };
 
//         res.json(result);
//     } catch (error) {
//         console.error('Error fetching FLM data:', error);
//         res.status(500).json({ message: 'Server error' });
//     }
// }

//flm(User) profile detail api...
const flmProfileData = async (req, res) => {
    try {
        console.log("req Body: ", req.body);
        const flmId = req.params.id;
        
        // Log and validate flmId
        if (!flmId) {
            return res.status(400).send({ message: "FlmId parameter is missing", success: false });
        }
        console.log("flmId: ", flmId);
        
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(flmId)) {
            return res.status(400).send({ message: "Invalid FlmId format", success: false });
        }

        // Fetch FLM data with only the required fields
        const flmData = await flmModel.findById(flmId).select('HQ area flmNumber flmName flmId flmEmail region zone');
        if (!flmData) {
            return res.status(404).send({ message: "Flm not found..!!", success: false });
        }
        console.log("flmData: ", flmData);

        // Find the SLM that references the FLM
        const slmData = await slmModel.findOne({ FLM: flmId }).populate('FLM', 'slmName');
        if (!slmData) {
            return res.status(404).send({ message: "SLM not found for the given FLM..!!", success: false });
        }
        console.log("slmData: ", slmData);

        // Combine the FLM data with the SLM name
        const result = {
            ...flmData._doc,
            slmName: slmData.slmName
        };

        res.json(result);
    } catch (error) {
        console.error('Error fetching FLM data:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PPM Feedback detail on saved (table) api....
const GetppmFeedback = async (req, res) => {
    const id = req.params.id;
 
    try {
        // Find the document by ID
        const flm = await flmModel.findById(id);
 
        if (!flm) {
            return res.status(404).json({ error: 'Flm data not found' });
        }
 
        // Extract ppmFeedback data
        const ppmFeedbackData = flm.ppmFeedback.map(feedback => ({
            feedbackId: feedback._id,
            accPPMDate: feedback.accPPMDate,
            accSpkName: feedback.accSpkName,
            scCode: feedback.scCode,
            doctorSpec: feedback.doctorSpec,
            place: feedback.place,
            noOfAttedance: feedback.noOfAttedance,
            venueName: feedback.venueName,
            brandName: feedback.brandName,
            totalExpenses: feedback.totalExpenses,
            ExpensePerAttendee: Math.round(parseFloat(feedback.totalExpenses) / parseFloat(feedback.noOfAttedance)),
            CreatedDate: feedback.DateOfCreation,
            ppmModifiedDate: feedback.ppmModifiedDate,
            status: feedback.ppmStatus ? 'Complete' : 'Incomplete',
            ppmFeedbackStatus: feedback.ppmFeedbackStatus,
        }));
 
        res.json(ppmFeedbackData);
    } catch (error) {
        console.error('Error fetching ppmFeedback data:', error);
        res.status(500).json({ error: 'Server error' });
    }
} 

//feedback required detail to update Feedback (Edit page) api...
const ppmFeedbackDetail = async (req, res) => {
    try {
        const { flmId, feedbackId } = req.params;
 
        // Find the document with the specified flmId
        const flmDoc = await flmModel.findById(flmId);
 
        if (!flmDoc) {
            return res.status(404).json({ message: 'FLM document not found' });
        }
 
        // Find the ppmFeedback with the specified ppmFeedbackid
        const ppmFeedback = flmDoc.ppmFeedback.id(feedbackId);
 
        if (!ppmFeedback) {
            return res.status(404).json({ message: 'ppmFeedback not found' });
        }
 
        res.json(ppmFeedback);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

//Plan status(table) api...
const planStatusDetails = async (req, res) => {
    
    try {
        //Handle flmId...
        const flmId = req.params.flmID;

        // Find the document by ID
        const flmExist = await flmModel.findById(flmId);
        if (!flmExist) {
            return res.status(404).json({ error: 'Flm not found' });
        }
 
        const flmStatusDetail = await flmExist.ppmState;
        
        res.json(flmStatusDetail);
    }  catch (err) {
        console.log(err);
        res.status(501).send({ message: "Failed to load plan details..!!", success: false });
    }
}

//Plan saved(table) api....
const planSavedDetail = async (req, res) => {
    try {
        const flmId = req.params.id;

        //Check flm exist or not..
        const flmExist = await flmModel.findById(flmId);
        if (!flmExist) {
            return res.status(404).send({ message: "Flm not found..!!", success: false });
        }

        //Iterate flm plan...
        const planData = flmExist.ppmPlanning.filter(plan => plan.ppmModeStatus === 'Saved');

        //Give response...
        res.json(planData);

    } catch (error) {
        console.log(error);
        res.status(501).send({ message: "Failed to load saved resource..!!", success: false });
    }
}

//Plan submit(table) api....
const planSubmitDetail = async (req, res) => {
    try {
        const flmId = req.params.id;

        //Check flm exist or not..
        const flmExist = await flmModel.findById(flmId);
        if (!flmExist) {
            return res.status(404).send({ message: "Flm not found..!!", success: false });
        }

        //Iterate flm plan...
        const planData = flmExist.ppmPlanning.filter(plan => plan.ppmModeStatus === 'Submitted');

        //Give response...
        res.json(planData);

    } catch (err) {
        console.log(err);
        res.status(501).send({message:"Failed to load submit table details..!!!",success:false})
    }
}






module.exports = {
    flmRegister,
    flmLogin,
    createPlan,
    updatePlan,
    deletePlan,
    updateStatePlan,
    planDetail,
    createFeedback,
    deleteFeedback,
    updateFeedback,
    flmProfileData,
    GetppmFeedback,
    ppmFeedbackDetail,
    planStatusDetails,
    planSavedDetail,
    planSubmitDetail,
    feedbackCreateRequireDetail,
    planRequiredDetail,
    
}