import mongoose,{Schema} from "mongoose";

const likeSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video",
    },
    tweet: {
        type: Schema.Types.ObjectId,
        ref: "Tweet",
    },
    likedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },


},
{
    timestamps:true,
})
export const Like = mongoose.model("Like",likeSchema)