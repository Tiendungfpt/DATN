import { Router } from "express";
import { getProfileUser, loginUser, registerUser } from "../controllers/auth";
import { checkAuth } from "../middlewares/checkAuth";

const authRouter = Router();

// POST api/auth
authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
//GET api/auth/profile
authRouter.get("/profile", checkAuth, getProfileUser);

export default authRouter;
