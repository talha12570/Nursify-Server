const Signup = require("../modals/user-modals");
const EmailVerificationToken = require("../modals/EmailVerificationToken");
const jobQueue = require("../utils/jobQueue");
const transport = require("../config/emailTransport");
const {
    normalizeCNIC,
    validateCNIC,
    validateNurseLicense,
    isCNICAvailable,
    isLicenseAvailable
} = require("../config/validation-data");

// Generate OTP
const generateOTP = () => {
    let OTP = "";
    for (let i = 0; i < 6; i++) {
        const randomValue = Math.round(Math.random() * 9);
        OTP += randomValue;
    }
    return OTP;
};

// Generate OTP email HTML template
const generateOTPEmailHTML = (OTP) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Nursify Healthcare</h1>
                <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Professional Healthcare Services</p>
            </div>
            
            <h2 style="color: #333; font-size: 22px; margin-bottom: 20px;">Email Verification Required</h2>
            
            <p style="color: #444; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Dear User,
            </p>
            
            <p style="color: #444; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Thank you for registering with <strong>Nursify Healthcare</strong>. To complete your registration and access our platform, please verify your email address using the One-Time Password (OTP) provided below:
            </p>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; text-align: center; margin: 30px 0; border-radius: 8px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 14px; font-weight: 600; letter-spacing: 1px;">YOUR VERIFICATION CODE</p>
                <h1 style="color: #ffffff; font-size: 36px; margin: 0; letter-spacing: 8px; font-weight: bold;">${OTP}</h1>
            </div>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #856404; margin: 0; font-size: 14px;">
                    <strong>⚠️ Important:</strong> This verification code will expire in <strong>1 hour</strong>. Please do not share this code with anyone.
                </p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                If you did not create an account with Nursify Healthcare, please disregard this email or contact our support team if you have concerns.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <div style="text-align: center; color: #999; font-size: 12px;">
                <p style="margin: 5px 0;">© 2025 Nursify Healthcare. All rights reserved.</p>
                <p style="margin: 5px 0;">Professional Healthcare Services Platform</p>
            </div>
        </div>
    </div>
`;

// Queue OTP Email with proper error handling
const queueOTPEmail = async (email, OTP) => {
    try {
        console.log('[auth-controller] ========== SENDING OTP EMAIL ==========');
        console.log('[auth-controller] To:', email);
        console.log('[auth-controller] OTP:', OTP);
        console.log('[auth-controller] Timestamp:', new Date().toISOString());
        
        const result = await jobQueue.addEmailJob({
            to: email,
            subject: "Verify Your Email Address - Nursify Healthcare",
            html: generateOTPEmailHTML(OTP)
        });
        
        console.log('[auth-controller] ✅ OTP email sent successfully');
        console.log('[auth-controller] Result:', result);
        console.log('[auth-controller] =========================================');
        return result;
    } catch (error) {
        console.error('[auth-controller] ❌ CRITICAL: Failed to send OTP email');
        console.error('[auth-controller] Email:', email);
        console.error('[auth-controller] Error:', error.message);
        console.error('[auth-controller] Stack:', error.stack);
        console.error('[auth-controller] =========================================');
        throw new Error(`Failed to send verification email: ${error.message}`);
    }
};

// Send OTP Email synchronously (for cases where we need to wait)
const sendOTPEmailSync = async (email, OTP) => {
    try {
        const info = await transport.sendMail({
            from: "Nursify Healthcare <noreply@nursify.com>",
            to: email,
            subject: "Verify Your Email Address - Nursify Healthcare",
            html: generateOTPEmailHTML(OTP)
        });
        console.log('[auth-controller] OTP email sent', { to: email, messageId: info?.messageId });
        return info;
    } catch (err) {
        console.error('[auth-controller] Error sending OTP email', err);
        throw err;
    }
};

const register = async(req,res,next)=>{
    try{
        console.log('[auth-controller] Registration request received');
        console.log('[auth-controller] Body:', req.body);
        console.log('[auth-controller] Files:', req.files ? Object.keys(req.files) : 'No files');
        
        const {
            fullName,
            email,
            password,
            phone,
            userType,
            cnicNumber,
            specialty,
            licenseNumber
        } = req.body;
        
        // Password strength validation
        if (!password || password.length < 8) {
            return res.status(400).json({ 
                message: "Password must be at least 8 characters long" 
            });
        }
        
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?])/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" 
            });
        }
        
        // Extract Cloudinary URLs from uploaded files
        const cnicFront = req.files && req.files['cnicFront'] ? req.files['cnicFront'][0].path : null;
        const cnicBack = req.files && req.files['cnicBack'] ? req.files['cnicBack'][0].path : null;
        const licensePhoto = req.files && req.files['licensePhoto'] ? req.files['licensePhoto'][0].path : null;
        const experienceLetter = req.files && req.files['experienceLetter'] ? req.files['experienceLetter'][0].path : null;
        const experienceImage = req.files && req.files['experienceImage'] ? req.files['experienceImage'][0].path : null;
        const professionalImage = req.files && req.files['professionalImage'] ? req.files['professionalImage'][0].path : null;
        const medicalRecord = req.files && req.files['medicalRecord'] ? req.files['medicalRecord'][0].path : null;
        
        console.log('[auth-controller] Cloudinary URLs extracted:', {
            cnicFront: cnicFront ? 'uploaded' : 'not provided',
            cnicBack: cnicBack ? 'uploaded' : 'not provided',
            licensePhoto: licensePhoto ? 'uploaded' : 'not provided',
            experienceLetter: experienceLetter ? 'uploaded' : 'not provided',
            experienceImage: experienceImage ? 'uploaded' : 'not provided',
            professionalImage: professionalImage ? 'uploaded' : 'not provided',
            medicalRecord: medicalRecord ? 'uploaded' : 'not provided'
        });
       
       const userExist =await Signup.findOne({email });

       if(userExist){
        // If user exists but is not verified, allow re-registration
        if(!userExist.isVerified){
            // Delete old unverified user and their tokens
            await EmailVerificationToken.deleteMany({ owner: userExist._id });
            await Signup.deleteOne({ _id: userExist._id });
            console.log('[auth-controller] Deleted unverified user for re-registration');
        } 
        // If user is rejected, allow re-registration with new documents
        else if(userExist.isRejected){
            // Delete rejected user and their tokens
            await EmailVerificationToken.deleteMany({ owner: userExist._id });
            await Signup.deleteOne({ _id: userExist._id });
            console.log('[auth-controller] Deleted rejected user for re-registration');
        }
        else {
            return res.status(400).json({message:"email already exists"});
        }
       }
       
       // ============ VALIDATION LOGIC ============
       
       // Normalize and validate CNIC
       const normalizedCNIC = normalizeCNIC(cnicNumber);
       
       if (!normalizedCNIC) {
           return res.status(400).json({ message: "CNIC number is required" });
       }
       
       // Validate CNIC against dummy dataset
       if (!validateCNIC(normalizedCNIC)) {
           return res.status(400).json({ 
               message: "Invalid CNIC number. Please provide a valid Pakistani CNIC.",
               field: "cnicNumber"
           });
       }
       
       // Check if CNIC is already used
       const cnicAvailable = await isCNICAvailable(normalizedCNIC, Signup);
       if (!cnicAvailable) {
           return res.status(400).json({ 
               message: "This CNIC number is already registered with another account.",
               field: "cnicNumber"
           });
       }
       
       // Validate nurse license if user is a nurse
       if (userType === 'nurse') {
           if (!licenseNumber) {
               return res.status(400).json({ 
                   message: "License number is required for nurses",
                   field: "licenseNumber"
               });
           }
           
           const licenseValidation = validateNurseLicense(licenseNumber);
           
           if (!licenseValidation.isValid) {
               return res.status(400).json({ 
                   message: "Invalid nurse license number. Please provide a valid RN or LPN license.",
                   field: "licenseNumber"
               });
           }
           
           // Check if license is already used
           const licenseAvailable = await isLicenseAvailable(licenseNumber, Signup);
           if (!licenseAvailable) {
               return res.status(400).json({ 
                   message: "This license number is already registered with another account.",
                   field: "licenseNumber"
               });
           }
           
           console.log(`[auth-controller] Valid ${licenseValidation.type} license verified`);
       }
       
       // ============ APPROVAL LOGIC ============
       // - Patients: Auto-approved after CNIC validation
       // - Caretakers: Require admin approval after CNIC validation
       // - Nurses: Require admin approval after CNIC + License validation
       
       const isApproved = userType === 'patient';
       
       const UserCreated =await Signup.create({
        fullName,
        email,
        password,
        phone,
        userType: userType || 'patient',
        isApproved,
        cnicNumber: normalizedCNIC, // Store normalized CNIC
        cnicFront: (userType === 'nurse' || userType === 'caretaker') ? cnicFront : null, // Only for nurses/caretakers
        cnicBack: (userType === 'nurse' || userType === 'caretaker') ? cnicBack : null, // Only for nurses/caretakers
        specialty,
        licenseNumber: userType === 'nurse' && licenseNumber ? licenseNumber.trim().toUpperCase() : undefined, // Store only for nurses
        licensePhoto,
        experienceLetter,
        experienceImage,
        professionalImage: (userType === 'nurse' || userType === 'caretaker') ? professionalImage : null, // Professional image for nurses/caretakers
        medicalRecord: userType === 'patient' ? medicalRecord : null // Medical record only for patients (optional)
        });
        
       console.log('[auth-controller] User created with ID:', UserCreated._id);
       console.log('[auth-controller] User approval status:', isApproved ? 'Auto-approved (Patient)' : 'Pending Admin Approval');

       // Generate and send OTP automatically
       const OTP = generateOTP();
       
       // Delete any existing tokens for this user
       await EmailVerificationToken.deleteMany({ owner: UserCreated._id });

       // Save OTP to database
       const emailVerificationToken = new EmailVerificationToken({
           owner: UserCreated._id,
           token: OTP,
       });
       await emailVerificationToken.save();
       console.log('[auth-controller] OTP saved to database');

       let responseMsg;
       if (userType === 'patient') {
           responseMsg = "Registration successful! Your CNIC has been validated. Please check your email for verification OTP.";
       } else if (userType === 'caretaker') {
           responseMsg = "Registration successful! Your CNIC has been validated. Please verify your email. Your account will be activated after admin approval.";
       } else if (userType === 'nurse') {
           responseMsg = "Registration successful! Your CNIC and license have been validated. Please verify your email. Your account will be activated after admin approval.";
       } else {
           responseMsg = "Registration successful! Please check your email for verification OTP.";
       }

       // Send response immediately to client (don't wait for email)
       res.status(200).json({
        msg: responseMsg,
        requiresVerification: true,
        requiresApproval: !isApproved,
        userType: userType || 'patient',
        email: email,
        cnicValidated: true,
        licenseValidated: userType === 'nurse' ? true : undefined
    });

       // Queue OTP email in background (non-blocking)
       queueOTPEmail(email, OTP)
           .then(() => {
               console.log('[auth-controller] OTP email queued successfully');
           })
           .catch((emailError) => {
               console.error('[auth-controller] Email delivery failed but registration succeeded');
               console.error('[auth-controller] User can request OTP resend or contact support');
               console.error('[auth-controller] Error:', emailError.message);
           });
    }catch(error){
        // res.status(500).json("internal server error", error);
        next(error);
    }
}

const login = async (req, res, next) => {
    try {
        console.log("login", req.body);
        
        const { email, password } = req.body;
        
        // Check if the user exists
        const userExist = await Signup.findOne({ email });
        console.log("userExist", userExist);

        if (!userExist) {
            // User does not exist, send error response
            return res.status(400).json({ message: "Invalid Credential" });
        }

        // Check if the password matches
        const match = await userExist.comparePassword(password);
        console.log("match", match);

        if (match) {
            // Block permanently banned users
            if (userExist.adminStatus === 'banned') {
                return res.status(403).json({
                    message: "Your account has been permanently banned from Nursify.",
                    banned: true
                });
            }

            // Admin users can login directly without OTP
            if (userExist.isAdmin) {
                const token = await userExist.generateToken();
                return res.status(200).json({
                    msg: "Admin login successful",
                    token: token,
                    userId: userExist._id.toString(),
                    userType: 'admin',
                    fullName: userExist.fullName,
                    email: userExist.email,
                    phone: userExist.phone,
                    isAvailable: userExist.isAvailable !== undefined ? userExist.isAvailable : true
                });
            }

            // Check if email is verified
            if (!userExist.isVerified) {
                // Check if a valid OTP already exists (less than 10 minutes old)
                let existingToken = await EmailVerificationToken.findOne({ owner: userExist._id });
                let OTP;
                
                const TEN_MINUTES = 10 * 60 * 1000; // 10 minutes in milliseconds
                const tokenAge = existingToken ? (new Date() - new Date(existingToken.createdAt)) : Infinity;
                
                if (existingToken && tokenAge < TEN_MINUTES) {
                    // Use existing OTP - don't regenerate
                    OTP = existingToken.token;
                    console.log('[auth-controller] Using existing OTP (age:', Math.floor(tokenAge / 60000), 'minutes)');
                } else {
                    // Generate new OTP (either no token exists or it's too old)
                    OTP = generateOTP();
                    
                    // Delete any existing tokens
                    await EmailVerificationToken.deleteMany({ owner: userExist._id });
                    
                    // Save new OTP to database
                    const emailVerificationToken = new EmailVerificationToken({
                        owner: userExist._id,
                        token: OTP,
                    });
                    await emailVerificationToken.save();
                    console.log('[auth-controller] New OTP saved for unverified user login');
                }
                
                // Send OTP email and wait for confirmation
                try {
                    await queueOTPEmail(email, OTP);
                    console.log('[auth-controller] OTP email sent for unverified user');
                } catch (emailError) {
                    console.error('[auth-controller] Failed to send OTP during login:', emailError.message);
                    return res.status(500).json({
                        message: "Failed to send verification email. Please try again later or contact support.",
                        error: emailError.message
                    });
                }
                
                return res.status(403).json({
                    message: "Please verify your email before logging in. OTP sent to your email.",
                    requiresVerification: true,
                    email: userExist.email,
                    userType: userExist.userType
                });
            }

            // Check if account is approved (for nurses and caretakers only)
            if ((userExist.userType === 'nurse' || userExist.userType === 'caretaker') && !userExist.isApproved) {
                return res.status(403).json({
                    message: "Your account is pending admin approval. You will be notified once approved.",
                    requiresApproval: true,
                    userType: userExist.userType
                });
            }

            // For verified and approved users, login directly without OTP

            // Auto-clear expired suspensions
            if (userExist.adminStatus === 'suspended' && userExist.suspensionEndDate && new Date() >= userExist.suspensionEndDate) {
                userExist.adminStatus = 'active';
                userExist.suspensionEndDate = null;
                await userExist.save();
            }

            const token = await userExist.generateToken();

            const { PRICING } = require('../utils/pricing');

            const userPayload = {
                _id: userExist._id.toString(),
                fullName: userExist.fullName,
                email: userExist.email,
                phone: userExist.phone,
                userType: userExist.userType,
                isAdmin: userExist.isAdmin,
                isVerified: userExist.isVerified,
                isApproved: userExist.isApproved,
                professionalImage: userExist.professionalImage,
                licenseNumber: userExist.licenseNumber,
                specialty: userExist.specialty,
                isAvailable: userExist.isAvailable !== undefined ? userExist.isAvailable : true,
                workExperience: userExist.workExperience,
                about: userExist.about,
                education: userExist.education,
                institution: userExist.institution,
                licenseType: userExist.licenseType,
                hourlyRate: PRICING.hourlyRate,
                dailyRate: null,
                weeklyRate: null,
                monthlyRate: null,
                adminStatus: userExist.adminStatus
            };

            // Suspended users can login but enter restricted mode
            if (userExist.adminStatus === 'suspended' && userExist.suspensionEndDate && new Date() < userExist.suspensionEndDate) {
                return res.status(200).json({
                    msg: "Login successful",
                    token: token,
                    suspended: true,
                    suspensionEndDate: userExist.suspensionEndDate,
                    userId: userExist._id.toString(),
                    userType: userExist.userType,
                    user: userPayload
                });
            }

            return res.status(200).json({
                msg: "Login successful",
                token: token,
                userId: userExist._id.toString(),
                userType: userExist.userType,
                user: {
                    _id: userExist._id.toString(),
                    fullName: userExist.fullName,
                    email: userExist.email,
                    phone: userExist.phone,
                    userType: userExist.userType,
                    isAdmin: userExist.isAdmin,
                    isVerified: userExist.isVerified,
                    isApproved: userExist.isApproved,
                    professionalImage: userExist.professionalImage,
                    licenseNumber: userExist.licenseNumber,
                    specialty: userExist.specialty,
                    isAvailable: userExist.isAvailable !== undefined ? userExist.isAvailable : true,
                    workExperience: userExist.workExperience,
                    about: userExist.about,
                    education: userExist.education,
                    institution: userExist.institution,
                    licenseType: userExist.licenseType,
                    hourlyRate: PRICING.hourlyRate,
                    dailyRate: null,
                    weeklyRate: null,
                    monthlyRate: null
                }
            });
        } else {
            // Password does not match, send error response
            return res.status(400).json({ message: "Invalid Credential" });
        }

    } catch (error) {
        // Catch any other errors and send a 500 response
        console.error("Login error:", error);
        res.status(500).json("internal server error");
        next(error); // Make sure this is the last thing called in the catch block
    }
};


const user = async (req, res,next) => {
    try {
        const userData = req.user;
        res.status(200).json({ userData });
    } catch (error) {
        // console.log(`error from the user route ${error}`);
        // res.status(500).json({ message: "Internal server error" });
        next(error)
    }
};

// Forgot Password - Send Reset OTP
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const userExist = await Signup.findOne({ email });

        if (!userExist) {
            return res.status(404).json({ message: "No account found with this email" });
        }

        // Generate OTP for password reset
        const OTP = generateOTP();

        // Delete any existing tokens for this user
        await EmailVerificationToken.deleteMany({ owner: userExist._id });

        // Save OTP to database
        const resetToken = new EmailVerificationToken({
            owner: userExist._id,
            token: OTP,
        });
        await resetToken.save();

        // Queue password reset email (non-blocking)
        jobQueue.addEmailJob({
            to: email,
            subject: "Password Reset - Nursify Healthcare",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Password Reset Request</h2>
                    <p>You requested to reset your password. Use the OTP below to proceed:</p>
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
                        <h1 style="color: #FF5722; font-size: 32px; margin: 0;">${OTP}</h1>
                    </div>
                    <p style="color: #666;">This code will expire in 1 hour.</p>
                    <p style="color: #666;">If you didn't request a password reset, please ignore this email.</p>
                </div>
            `
        });

        res.status(200).json({
            message: "Password reset OTP sent to your email",
            success: true,
            email: email
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        next(error);
    }
};

// Reset Password - Verify OTP and Update Password
const resetPassword = async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({ 
                message: "Email and new password are required" 
            });
        }
        
        // Password strength validation
        if (newPassword.length < 8) {
            return res.status(400).json({ 
                message: "Password must be at least 8 characters long" 
            });
        }
        
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?])/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ 
                message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" 
            });
        }

        const userExist = await Signup.findOne({ email });

        if (!userExist) {
            return res.status(404).json({ message: "User not found" });
        }

        // If OTP is provided, verify it
        if (otp) {
            // Find the reset token
            const token = await EmailVerificationToken.findOne({ owner: userExist._id });

            if (!token) {
                return res.status(400).json({ 
                    message: "Invalid or expired OTP. Please request a new one." 
                });
            }

            // Verify OTP
            const isValid = await token.compareToken(otp);

            if (!isValid) {
                return res.status(400).json({ message: "Invalid OTP" });
            }

            // Delete the used token
            await EmailVerificationToken.deleteOne({ _id: token._id });
        }

        // Update password
        userExist.password = newPassword;
        await userExist.save();

        res.status(200).json({
            message: "Password reset successful. You can now login with your new password.",
            success: true
        });
    } catch (error) {
        console.error("Reset password error:", error);
        next(error);
    }
};

module.exports={register,login,user,forgotPassword,resetPassword}; 
