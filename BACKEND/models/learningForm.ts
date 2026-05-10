import mongoose, {Schema, Document, model} from "mongoose";

type LearningMethod = "Videos/YouTube"
    | "Articles/Blogs"
    |"Books/E-books"
    |"Online Courses"
    |"Podcasts/Interviews"
    |"Community/Forums"
    |"I want to connect with other participants"

export interface ILearningForm extends Document {
    whatDoYouWantToLearn: string,
    describeYourCurrentSKill: string,
    timeDaily: number,
    learningMethods: LearningMethod[],
    userID: string
}

const LearningFormSchema = new Schema({
    whatDoYouWantToLearn: {
        type: String,
        required: true,
    },
    describeYourCurrentSKill: {
        type: String,
        required: true,
    },
    timeDaily: {
        type: Number,
        required: true,
    },
    learningMethods: {
            type: [String],
            enum: [
                "Videos/YouTube",
                "Articles/Blogs",
                "Books/E-books",
                "Online Courses",
                "Podcasts/Interviews",
                "Community/Forums",
                "I want to connect with other participants"
            ],
            default: []
        },
    userID:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }
})
export const LearningGoal = model<ILearningForm>("LearningGoal", LearningFormSchema);
