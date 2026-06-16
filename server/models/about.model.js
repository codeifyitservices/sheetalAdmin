import mongoose from "mongoose";

const aboutSchema = new mongoose.Schema(
  {
    banner: {
      image: String,
      title: String,
    },
    journey: {
      image: String,
      title: String,
      description: String,
    },
    mission: {
      image: String,
      title: String,
      description: String,
    },
    craft: {
      image: String,
      title: String,
      description: String,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

// Singleton pattern conceptually - we'll always fetch the first document
const About = mongoose.model("About", aboutSchema);

export default About;
