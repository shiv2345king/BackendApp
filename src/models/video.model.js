import mongoose,{Schema} from 'mongoose'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'
const videoSchema = new Schema({
    videoFile: {
        type: String,
        required: [true, 'Video file is required'],
    },
    thumbnail: {
        type: String,
        required: [true, 'Thumbnail is required'],
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
     title: {
        type: String,
        required: [true, 'Title is required'],
    },
     description: {
        type: String,
        required: [true, 'Description is required'],
    },
     duration: {
        type: Number,
        required: [true, 'Duration is required'],
    },
    views: {
        type: Number,
        default: 0,
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true
})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model('Video', videoSchema)