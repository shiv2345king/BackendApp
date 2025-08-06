import mongoose from 'mongoose'
import {  DB_NAME } from '../constants.js'

const connectDB = async () => {
    try {
        const connectionstatus = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`MongoDB connected: ${connectionstatus.connection.host}`);
    }
    catch(error) {
        console.error('MONGODB connection error:', error);
        process.exit(1);
    }
}
export default connectDB;