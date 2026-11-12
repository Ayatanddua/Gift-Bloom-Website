import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const app = express();

const PORT = process.env.PORT || 3000;


// ==============================
// MIDDLEWARE
// ==============================

app.use(cors());

app.use(express.json());

app.use(express.static("public"));

app.use("/uploads", express.static("uploads"));


// ==============================
// CREATE UPLOADS FOLDER
// ==============================

if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}


// ==============================
// REVIEW SCHEMA
// ==============================

const reviewSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 60
    },

    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },

    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },

    image: {
        type: String,
        default: ""
    }

}, {
    timestamps: true
});


const Review = mongoose.model("Review", reviewSchema);


// ==============================
// MULTER IMAGE STORAGE
// ==============================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(null, "uploads/");

    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() + "-" +
            Math.round(Math.random() * 1000000);

        cb(
            null,
            uniqueName + path.extname(file.originalname).toLowerCase()
        );

    }

});


const upload = multer({

    storage: storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: function (req, file, cb) {

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (allowedTypes.includes(file.mimetype)) {

            cb(null, true);

        } else {

            cb(new Error("Only JPG, PNG and WEBP images are allowed."));

        }

    }

});


// ==============================
// HOME ROUTE
// ==============================

app.get("/", (req, res) => {

    res.send("Gift Bloom Server is Running!");

});


// ==============================
// SUBMIT REVIEW
// ==============================

app.post(
    "/api/reviews",
    upload.single("image"),
    async (req, res) => {

        try {

            const { name, rating, message } = req.body;

            if (!name || !rating || !message) {

                return res.status(400).json({

                    success: false,

                    message: "Please fill all required fields."

                });

            }

            const numericRating = Number(rating);

            if (
                !Number.isInteger(numericRating) ||
                numericRating < 1 ||
                numericRating > 5
            ) {

                return res.status(400).json({

                    success: false,

                    message: "Rating must be between 1 and 5."

                });

            }

            const newReview = new Review({

                name: name,

                rating: numericRating,

                message: message,

                image: req.file
                    ? "/uploads/" + req.file.filename
                    : ""

            });


            await newReview.save();


            return res.status(201).json({

                success: true,

                message: "Review submitted successfully!",

                review: newReview

            });


        } catch (error) {

            console.log("Review Submission Error:", error);

            return res.status(500).json({

                success: false,

                message: "Unable to submit review."

            });

        }

    }
);


// ==============================
// GET ALL REVIEWS
// ==============================

app.get("/api/reviews", async (req, res) => {

    try {

        const reviews = await Review.find()
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json(reviews);

    } catch (error) {

        console.log("Get Reviews Error:", error);

        return res.status(500).json({

            success: false,

            message: "Unable to load reviews."

        });

    }

});

// ==============================
// ERROR HANDLING
// ==============================

app.use((error, req, res, next) => {

    console.log("Server Error:", error.message);

    if (res.headersSent) {
        return next(error);
    }

    return res.status(400).json({

        success: false,

        message: error.message || "Something went wrong."

    });

});


// ==============================
// MONGODB CONNECTION
// ==============================

mongoose.connect(process.env.MONGO_URI)

    .then(() => {

        console.log("MongoDB Connected Successfully!");

        app.listen(PORT, () => {

            console.log(`Server running on port ${PORT}`);

            console.log(`Website: http://localhost:${PORT}/reviews.html`);

        });

    })

    .catch((error) => {

        console.log("MongoDB Connection Error:", error.message);

    });
