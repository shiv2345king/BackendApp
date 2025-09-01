import mongoose,{Schema} from "mongoose";

const subscriptionSchema = new Schema({
   subscriber: {
      type: Schema.Types.ObjectId , //the one who is subscribing
      ref: "User",
   },
   channel : {

   }
},
{ timestamps: true }
)

export const Subscription = mongoose.model("Subscription",subscriptionSchema)