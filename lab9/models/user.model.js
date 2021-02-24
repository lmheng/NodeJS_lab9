const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const validator = require("validator");

const schema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: (value) => {
      if (!validator.isEmail(value)) {
        throw new Error({ error: "Invalid Email address" });
      }
    },
  },
  password: { type: String, required: true, minlength: 5 },
  roles: { type: [{ type: String }], default: ["user"] },
});

const getJwtBody = ({ _id, email, roles }) => ({ _id, email, roles });

const bcrypt = require("bcryptjs");
schema.pre("save", async function (next) {
  // Hash the password before saving the user model
  const user = this;
  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

schema.post("save", function (error, doc, next) {
  if (error.name === "MongoError" && error.code === 11000) {
    next(new Error("Email already registered"));
  } else {
    next(error);
  }
});

schema.methods.generateAuthToken = async function () {
  const user = this;
  const token = jwt.sign(getJwtBody(user), process.env.JWT_KEY, {
    expiresIn: process.env.JWT_EXP,
  });
  return token;
};

schema.statics.findByCredentials = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error({ error: "Invalid login credentials" });
  }
  const isMatched = await bcrypt.compare(password, user.password);
  //const isMatched = password === user.password;
  if (!isMatched) {
    throw new Error({ error: "Invlaid login credentials" });
  }
  return user;
};

const User = mongoose.model("User", schema, "users");
module.exports = User;
