import jwt from "jsonwebtoken";
import env from "../config/env.js";

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    env.jwtAccessSecret,
    {
      expiresIn: "15m",
    },
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
    },
    env.jwtRefreshSecret,
    {
      expiresIn: "7d",
    },
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwtAccessSecret);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.jwtRefreshSecret);
};

export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
