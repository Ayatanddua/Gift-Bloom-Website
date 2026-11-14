import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Optional OpenAI Integration
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== "") {
    try {
        const { default: OpenAI } = await import("openai");
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        console.log("OpenAI client initialized successfully.");
    } catch (err) {
        console.warn("OpenAI could not be initialized:", err.message);
    }
}

const app = express();
const PORT = process.env.PORT || 5501;

// ==============================
// MIDDLEWARE
// ==============================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from project root and public folder
app.use(express.static(path.resolve("public")));
app.use(express.static(path.resolve(".")));
app.use("/uploads", express.static(path.resolve("uploads")));

// ==============================
// CREATE REQUIRED FOLDERS
// ==============================
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads", { recursive: true });
}
if (!fs.existsSync("data")) {
    fs.mkdirSync("data", { recursive: true });
}

const LOCAL_REVIEWS_FILE = path.resolve("data", "reviews.json");
if (!fs.existsSync(LOCAL_REVIEWS_FILE)) {
    fs.writeFileSync(LOCAL_REVIEWS_FILE, JSON.stringify([], null, 2), "utf8");
}

function getLocalReviews() {
    try {
        const data = fs.readFileSync(LOCAL_REVIEWS_FILE, "utf8");
        return JSON.parse(data) || [];
    } catch (e) {
        return [];
    }
}

function saveLocalReview(review) {
    try {
        const reviews = getLocalReviews();
        reviews.unshift(review);
        fs.writeFileSync(LOCAL_REVIEWS_FILE, JSON.stringify(reviews, null, 2), "utf8");
        return true;
    } catch (e) {
        console.error("Error writing to local reviews file:", e);
        return false;
    }
}

// ==============================
// REVIEW SCHEMA & MONGO STATUS
// ==============================
let isMongoConnected = false;

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
        const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1000000);
        cb(null, uniqueName + path.extname(file.originalname).toLowerCase());
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
            "image/jpg",
            "image/png",
            "image/webp"
        ];
        if (allowedTypes.includes(file.mimetype.toLowerCase())) {
            cb(null, true);
        } else {
            cb(new Error("Only JPG, PNG and WEBP images are allowed."));
        }
    }
});

// ==============================
// ROUTES
// ==============================

// Home Route: Serves index.html
app.get("/", (req, res) => {
    res.sendFile(path.resolve("index.html"));
});

// Reviews page redirect/alias
app.get("/reviews", (req, res) => {
    if (fs.existsSync(path.resolve("reviews.html"))) {
        res.sendFile(path.resolve("reviews.html"));
    } else {
        res.sendFile(path.resolve("reveiws.html"));
    }
});

// SUBMIT REVIEW
app.post("/api/reviews", upload.single("image"), async (req, res) => {
    try {
        const { name, rating, message } = req.body;

        if (!name || !rating || !message) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields (name, rating, message)."
            });
        }

        const numericRating = Number(rating);
        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be an integer between 1 and 5."
            });
        }

        const imagePath = req.file ? "/uploads/" + req.file.filename : "";

        let savedReview = null;

        if (isMongoConnected) {
            try {
                const newReview = new Review({
                    name: name.trim(),
                    rating: numericRating,
                    message: message.trim(),
                    image: imagePath
                });
                savedReview = await newReview.save();
            } catch (mongoErr) {
                console.warn("MongoDB save failed, using local storage fallback:", mongoErr.message);
            }
        }

        // Fallback or mirror in local JSON storage
        if (!savedReview) {
            savedReview = {
                _id: "local-" + Date.now(),
                name: name.trim(),
                rating: numericRating,
                message: message.trim(),
                image: imagePath,
                createdAt: new Date().toISOString()
            };
            saveLocalReview(savedReview);
        }

        return res.status(201).json({
            success: true,
            message: "Review submitted successfully!",
            review: savedReview
        });

    } catch (error) {
        console.error("Review Submission Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to submit review."
        });
    }
});

// GET ALL REVIEWS
app.get("/api/reviews", async (req, res) => {
    try {
        if (isMongoConnected) {
            try {
                const mongoReviews = await Review.find().sort({ createdAt: -1 }).lean();
                if (mongoReviews && mongoReviews.length > 0) {
                    return res.status(200).json(mongoReviews);
                }
            } catch (mongoErr) {
                console.warn("MongoDB fetch failed, reading from local fallback:", mongoErr.message);
            }
        }

        // Fallback to local storage
        const localReviews = getLocalReviews();
        return res.status(200).json(localReviews);

    } catch (error) {
        console.error("Get Reviews Error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load reviews."
        });
    }
});

// AI GIFT RECOMMENDATION ASSISTANT
app.post("/api/ai-suggest", async (req, res) => {
    try {
        const { occasion, budget, recipient, preference } = req.body || {};

        if (openai) {
            try {
                const prompt = `You are a helpful gift consultant for "Gift Bloom", a boutique store in Pakistan specializing in luxury gift hampers, flower bouquets, chocolate arrangements, birthday frames, customized explosion boxes, and teddy gifts.
Recommend 2-3 specific gifts based on:
Occasion: ${occasion || "Any"}
Recipient: ${recipient || "Loved one"}
Budget: ${budget ? "PKR " + budget : "Flexible"}
Preferences: ${preference || "None"}

Keep it polite, warm, and concise in 3-4 bullet points. Mention that orders can be customized and ordered directly via WhatsApp (0322-7079455).`;

                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 300
                });

                return res.json({
                    success: true,
                    recommendation: completion.choices[0]?.message?.content || "Check out our luxury hampers!"
                });
            } catch (err) {
                console.warn("OpenAI API call failed:", err.message);
            }
        }

        // Smart fallback recommendations
        let suggestion = "Here are top recommended gifts from Gift Bloom:\n";
        suggestion += "1. 🎁 *Luxury Celebration Gift Basket (PKR 4,999)* - Danisa Cookies, Chocolates & Peach Roses.\n";
        suggestion += "2. 🌸 *Chocolate & Fresh Flower Bouquet* - Perfect for birthdays and anniversaries.\n";
        suggestion += "3. 📦 *Custom Explosion Gift Box & Photo Frame* - Personalized memories made with love.\n\n";
        suggestion += "All gifts can be customized to your exact requirements! Contact us on WhatsApp (0322-7079455) for instant ordering.";

        return res.json({
            success: true,
            recommendation: suggestion
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Unable to generate gift suggestions right now."
        });
    }
});

// ==============================
// ERROR HANDLING MIDDLEWARE
// ==============================
app.use((error, req, res, next) => {
    console.error("Server Error:", error.message);
    if (res.headersSent) {
        return next(error);
    }
    return res.status(400).json({
        success: false,
        message: error.message || "Something went wrong."
    });
});

// ==============================
// START SERVER & CONNECT DATABASE
// ==============================
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/giftbloom";

// Start HTTP server immediately so the website is accessible
app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🌸 Gift Bloom Server is Running!`);
    console.log(`🌐 Website URL: http://localhost:${PORT}`);
    console.log(`⭐ Reviews Page: http://localhost:${PORT}/reviews.html`);
    console.log(`🛍️ Products Page: http://localhost:${PORT}/product.html`);
    console.log(`===============================================`);
});

// Connect to MongoDB asynchronously without blocking the server
mongoose.connect(mongoUri)
    .then(() => {
        isMongoConnected = true;
        console.log("✓ MongoDB Connected Successfully!");
    })
    .catch((error) => {
        isMongoConnected = false;
        console.log("ℹ️ Local MongoDB not running (using local data store for reviews):", error.message);
    });
