import mongoose,{Schema,Document} from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document{
    login: string;
    email: string;
    password: string;
    dateOfBirth: Date;
}
const UserSchema: Schema = new Schema({
    login:{
        type: String,
        required: true,
        unique: true,
        minlength: 3,
        trim: true,
    },
    email:{
        type: String,
        required: true,
        unique: true,
        match: [/^\S+@\S+\.\S+$/,"incorrect email "],
    },
    password:{
        type: String,
        required: true,
        minlength: 8,

    },
    dateOfBirth:{
        type: Date,
        required: true,
    }

},{
    timestamps: true,
})


UserSchema.pre('save', async function(this:IUser) {

    if (!this.isModified('password')) return;

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password as string, salt);

    } catch (err) {
        throw err as Error;
    }
});

export const User = mongoose.model<IUser>("User", UserSchema);

