import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { sendEmail, emailVerificationMailgenContent } from "../utils/mail.js";
import {
    userLoginValidator,
    userRegistrationValidator,
} from "../validators/index.js";
import crypto from "crypto";

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating referesh and access token",
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    let { email, username, password, fullName, avatar } = req.body;

    //validation
    // registrationValidation(body);

    userRegistrationValidator(req.body);

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new ApiError(400, "User already exists");
    }

    if (req.file) {
        const localPath = req.file.path;
        const url = `${req.protocol}://${req.get("host")}/${localPath}`;
        avatar = { url, localPath };
    }

    const user = await User.create({
        username,
        email,
        password,
        fullName,
        avatar,
    });

    if (!user) {
        throw new ApiError(400, "user not found");
    }

    const { unHashedToken, hashedToken, tokenExpiry } =
        user.generateTemporaryToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;

    await user.save();

    await sendEmail({
        email: user.email,
        subject: "Verify your email",
        mailgenContent: emailVerificationMailgenContent(
            username,
            `${process.env.BASE_URL}/api/v1/users/verify/${unHashedToken}`,
        ),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken",
    );

    if (!createdUser)
        throw new ApiError(500, "user registration failed, please try again");

    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "user registered successfully"),
        );
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    //validation
    userLoginValidator(req.body);

    const checkUser = await User.findOne({ email });

    if (!checkUser) {
        throw new ApiError(404, "Invalid email or password ");
    }

    const isMatch = await checkUser.isPasswordCorrect(password);

    if (!isMatch) {
        throw new ApiError(400, "Invalid email or password");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
        checkUser._id,
    );

    const loggedInUser = await User.findById(checkUser._id).select(
        "-password -refreshToken",
    );

    // const options = {
    //     httpOnly: true,
    //     secure: true,
    //     sameSite: "Lax",
    // };


    // Set cookie with minimal options for testing
    const options = {
        httpOnly: true, // Set to false for testing
        secure: false, // Set to false for local development
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      };

    //   console.log("Response headers:", res.getHeaders());

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged In Successfully",
            ),
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1, // this removes the field from document
            },
        },
        {
            new: true,
        },
    );

    // const options = {
    //     httpOnly: true,
    //     secure: true,
    // };


    // Set cookie with minimal options for testing
    const options = {
        httpOnly: true, // Set to false for testing
        secure: false, // Set to false for local development
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"));
});

const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.params;

    //validation
    if (!token) {
        throw new ApiError(400, "Invalid token");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({ emailVerificationToken: hashedToken });

    if (!user) {
        throw new ApiError(400, "Invalid token");
    }

    if (user.isEmailVerified === true) {
        throw new ApiError(400, "Email is already verified");
    }

    if (
        user.emailVerificationExpiry &&
        user.emailVerificationExpiry < new Date()
    ) {
        throw new ApiError(400, "Verification token has expired");
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    res.status(200).json(new ApiResponse(200, "User verified successfully"));
});

const resendEmailVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;

    // 1. Validation
    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.isEmailVerified) {
        throw new ApiError(400, "Email is already verified");
    }

    // 2. Generate new token and expiry
    const { unHashedToken, hashedToken, tokenExpiry } =
        user.generateTemporaryToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;
    await user.save();

    // 3. Resend verification email
    await sendEmail({
        email: user.email,
        subject: "Verify your email",
        mailgenContent: emailVerificationMailgenContent(
            user.username,
            `${process.env.BASE_URL}/api/v1/users/verify/${unHashedToken}`,
        ),
    });

    res.status(200).json(
        new ApiResponse(200, null, "Verification email resent successfully"),
    );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefereshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed",
                ),
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
    
});

const resetForgottenPassword = asyncHandler(async (req, res) => {
    
});

export {
    changeCurrentPassword,
    forgotPasswordRequest,
    getCurrentUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    resendEmailVerification,
    resetForgottenPassword,
    verifyEmail,
};
