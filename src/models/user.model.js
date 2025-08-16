import mongoose,{Schema} from 'mongoose'

const userSchema = new Schema(
    {
       userName: {
            type: String,
            required: true,
            unique: true,
            lowerCase: true,
            trim: true,
            index: true
       },
       email: {
            type: String,
            required: true,
            unique: true,
            lowerCase: true,
            trim: true,
       },
       fullName: {
            type: String,
            required: true,
            trim: true,
            index: true,
       },
       avatar: {
            type: String,    //cloudinary url
            required: true,
       },
       watchHistory: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Video',
        }
       ],
       password: {
           type:String,
           required: [true,'Password is required'],
       },
       refreshToken: {
          type:String,
       },

    },
    {
        timestamps: true
    })

    userSchema.pre("save", async function (next) {
        if (!this.isModified("password")) return next();
        this.password = await hashPassword(this.password);
        next();
    })

    userSchema.methods.isPasswordCorrect = async function (password) {
        return await bcrypt.compare(password,this.password)
    }

    userSchema.methods.generateAccessToken = function () {
        jwt.sign(
            {
                _id: this._id,
                email: this.email,
                fullName: this.fullName,
                userName: this.userName,
            },
            process.env.ACCESS_SECRET_TOKEN,
            { 
                expiresIn: process.env.ACCESS_TOKEN_EXPIRY
            },
        );
    }
    userSchema.methods.generateRefreshToken = function () {
         jwt.sign(
            {
                _id: this._id,
                email: this.email,
                fullName: this.fullName,
                userName: this.userName,
            },
            process.env.REFRESH_TOKEN_SECRET,
            {
                expiresIn: process.env.REFRESH_TOKEN_EXPIRY
            },
        );
    }


export const User = mongoose.model('User',userSchema)