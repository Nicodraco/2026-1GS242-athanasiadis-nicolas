import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose, { Schema, Types } from "mongoose";
import { MongoServerError } from "mongodb";
import type { NextFunction, Request, Response } from "express";
import type { HydratedDocument } from "mongoose";

dotenv.config();

type Role = "teacher" | "student";

type AuthUser = {
  id: string;
  role: Role;
  name: string;
  email: string;
};

type UserDocument = {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
};

type PollOption = {
  _id: Types.ObjectId;
  text: string;
};

type PollDocument = {
  code: string;
  question: string;
  options: PollOption[];
  isClosed: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
};

type VoteDocument = {
  pollId: Types.ObjectId;
  optionId: string;
  studentId: string;
  studentName: string;
};

type AuthRequest<TParams = Record<string, string>> = Request<TParams> & {
  authUser?: AuthUser;
};

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/pollclass";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET ?? "change-this-in-production";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ??
  "1d") as jwt.SignOptions["expiresIn"];

app.use(
  cors({
    origin: FRONTEND_URL,
  })
);
app.use(express.json());

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: 120,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["teacher", "student"], required: true },
  },
  { timestamps: true }
);

const optionSchema = new Schema<PollOption>(
  {
    text: { type: String, required: true, trim: true, maxlength: 120 },
  },
  { _id: true }
);

const pollSchema = new Schema<PollDocument>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      minlength: 6,
      maxlength: 6,
    },
    question: { type: String, required: true, trim: true, maxlength: 200 },
    options: {
      type: [optionSchema],
      validate: {
        validator: (value: PollOption[]) =>
          value.length >= 2 && value.length <= 4,
        message: "A poll must have between 2 and 4 options",
      },
      required: true,
    },
    isClosed: { type: Boolean, default: false },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

const voteSchema = new Schema<VoteDocument>(
  {
    pollId: { type: Schema.Types.ObjectId, ref: "Poll", required: true },
    optionId: { type: String, required: true },
    studentId: { type: String, required: true },
    studentName: { type: String, required: true, trim: true, maxlength: 80 },
  },
  { timestamps: true }
);

voteSchema.index({ pollId: 1, studentId: 1 }, { unique: true });

const User = mongoose.model<UserDocument>("User", userSchema);
const Poll = mongoose.model<PollDocument>("Poll", pollSchema);
const Vote = mongoose.model<VoteDocument>("Vote", voteSchema);

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getCodeParam(req: Request<{ code: string }>) {
  const code = req.params.code?.trim().toUpperCase();
  if (!code) {
    throw new HttpError(400, "Poll code is required");
  }
  return code;
}

function authUserToPayload(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function signToken(user: AuthUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    next(new HttpError(401, "Authentication required"));
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    next(new HttpError(401, "Authentication required"));
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (
      typeof decoded !== "object" ||
      !decoded ||
      typeof decoded.id !== "string" ||
      (decoded.role !== "teacher" && decoded.role !== "student") ||
      typeof decoded.name !== "string" ||
      typeof decoded.email !== "string"
    ) {
      throw new HttpError(401, "Invalid token");
    }
    req.authUser = {
      id: decoded.id,
      role: decoded.role,
      name: decoded.name,
      email: decoded.email,
    };
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
}

function requireRole(role: Role) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.authUser) {
      next(new HttpError(401, "Authentication required"));
      return;
    }
    if (req.authUser.role !== role) {
      next(new HttpError(403, "Forbidden"));
      return;
    }
    next();
  };
}

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function generateUniqueCode() {
  for (let i = 0; i < 10; i += 1) {
    const code = randomCode();
    const exists = await Poll.exists({ code });
    if (!exists) {
      return code;
    }
  }
  throw new HttpError(500, "Could not generate a unique poll code");
}

async function findPollByCode(code: string) {
  const poll = await Poll.findOne({ code });
  if (!poll) {
    throw new HttpError(404, "Poll not found");
  }
  return poll;
}

async function getPollResults(poll: HydratedDocument<PollDocument>) {
  const groupedVotes = await Vote.aggregate([
    { $match: { pollId: poll._id } },
    { $group: { _id: "$optionId", votes: { $sum: 1 } } },
  ]);

  const voteMap = new Map<string, number>();
  for (const item of groupedVotes) {
    voteMap.set(item._id, item.votes);
  }

  const options = poll.options.map((option) => {
    const id = option._id.toString();
    return {
      id,
      text: option.text,
      votes: voteMap.get(id) ?? 0,
    };
  });

  const totalVotes = options.reduce((acc, option) => acc + option.votes, 0);
  return {
    code: poll.code,
    question: poll.question,
    isClosed: poll.isClosed,
    totalVotes,
    options: options.map((option) => ({
      ...option,
      percentage:
        totalVotes === 0
          ? 0
          : Number(((option.votes / totalVotes) * 100).toFixed(2)),
    })),
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/register", async (req: Request, res: Response) => {
  const name = String(req.body.name ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  const role = String(req.body.role ?? "").trim() as Role;

  if (!name) throw new HttpError(400, "Name is required");
  if (!email) throw new HttpError(400, "Email is required");
  if (password.length < 6) {
    throw new HttpError(400, "Password must have at least 6 characters");
  }
  if (role !== "teacher" && role !== "student") {
    throw new HttpError(400, "Role must be teacher or student");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let user: HydratedDocument<UserDocument>;
  try {
    user = await User.create({ name, email, passwordHash, role });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new HttpError(409, "Email already registered");
    }
    throw error;
  }

  const authUser: AuthUser = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };

  res.status(201).json({ user: authUserToPayload(authUser), token: signToken(authUser) });
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");

  if (!email || !password) {
    throw new HttpError(400, "Email and password are required");
  }

  const user = await User.findOne({ email });
  if (!user) throw new HttpError(401, "Invalid credentials");
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) throw new HttpError(401, "Invalid credentials");

  const authUser: AuthUser = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
  res.json({ user: authUserToPayload(authUser), token: signToken(authUser) });
});

app.post("/api/auth/logout", (_req: Request, res: Response) => {
  res.status(204).send();
});

app.get("/api/auth/me", requireAuth, (req: AuthRequest, res: Response) => {
  if (!req.authUser) {
    throw new HttpError(401, "Not authenticated");
  }
  res.json({ user: authUserToPayload(req.authUser) });
});

app.post(
  "/api/polls",
  requireAuth,
  requireRole("teacher"),
  async (req: AuthRequest, res: Response) => {
    if (!req.authUser) throw new HttpError(401, "Authentication required");
    const question = String(req.body.question ?? "").trim();
    const rawOptions: unknown[] = Array.isArray(req.body.options)
      ? req.body.options
      : [];
    const options = rawOptions
      .map((option: unknown) => String(option ?? "").trim())
      .filter(Boolean)
      .slice(0, 4)
      .map((text: string) => ({ text }));

    if (!question) throw new HttpError(400, "Question is required");
    if (options.length < 2 || options.length > 4) {
      throw new HttpError(400, "A poll needs between 2 and 4 options");
    }

    const code = await generateUniqueCode();
    const poll = await Poll.create({
      code,
      question,
      options,
      createdBy: new Types.ObjectId(req.authUser.id),
    });
    const results = await getPollResults(poll);
    res.status(201).json(results);
  }
);

app.get(
  "/api/polls",
  requireAuth,
  requireRole("teacher"),
  async (req: AuthRequest, res: Response) => {
    if (!req.authUser) throw new HttpError(401, "Authentication required");
    const createdBy = new Types.ObjectId(req.authUser.id);
    const polls = await Poll.find({ createdBy }).sort({ createdAt: -1 }).lean();
    const voteTotals = await Vote.aggregate([
      { $match: { pollId: { $in: polls.map((poll) => poll._id) } } },
      { $group: { _id: "$pollId", totalVotes: { $sum: 1 } } },
    ]);
    const totalsMap = new Map(
      voteTotals.map((item) => [item._id.toString(), item.totalVotes])
    );

    res.json(
      polls.map((poll) => ({
        id: poll._id.toString(),
        code: poll.code,
        question: poll.question,
        isClosed: poll.isClosed,
        createdAt: poll.createdAt,
        totalVotes: totalsMap.get(poll._id.toString()) ?? 0,
      }))
    );
  }
);

app.get("/api/polls/:code", async (req: Request<{ code: string }>, res: Response) => {
  const poll = await findPollByCode(getCodeParam(req));
  res.json({
    code: poll.code,
    question: poll.question,
    isClosed: poll.isClosed,
    options: poll.options.map((option) => ({
      id: option._id.toString(),
      text: option.text,
    })),
  });
});

app.get(
  "/api/polls/:code/results",
  async (req: Request<{ code: string }>, res: Response) => {
    const poll = await findPollByCode(getCodeParam(req));
    const results = await getPollResults(poll);
    res.json(results);
  }
);

app.get(
  "/api/polls/:code/my-vote",
  requireAuth,
  requireRole("student"),
  async (req: AuthRequest<{ code: string }>, res: Response) => {
    if (!req.authUser) throw new HttpError(401, "Authentication required");
    const poll = await findPollByCode(getCodeParam(req));
    const vote = await Vote.findOne({
      pollId: poll._id,
      studentId: req.authUser.id,
    });
    res.json({ hasVoted: Boolean(vote), optionId: vote?.optionId ?? null });
  }
);

app.post(
  "/api/polls/:code/votes",
  requireAuth,
  requireRole("student"),
  async (req: AuthRequest<{ code: string }>, res: Response) => {
    if (!req.authUser) throw new HttpError(401, "Authentication required");
    const optionId = String(req.body.optionId ?? "").trim();
    if (!optionId) throw new HttpError(400, "optionId is required");

    const poll = await findPollByCode(getCodeParam(req));
    if (poll.isClosed) throw new HttpError(400, "Poll is already closed");
    const optionExists = poll.options.some(
      (option) => option._id.toString() === optionId
    );
    if (!optionExists) {
      throw new HttpError(400, "Option does not belong to this poll");
    }

    try {
      await Vote.create({
        pollId: poll._id,
        optionId,
        studentId: req.authUser.id,
        studentName: req.authUser.name,
      });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new HttpError(409, "This student already voted in this poll");
      }
      throw error;
    }

    const results = await getPollResults(poll);
    res.status(201).json(results);
  }
);

app.patch(
  "/api/polls/:code/close",
  requireAuth,
  requireRole("teacher"),
  async (req: AuthRequest<{ code: string }>, res: Response) => {
    if (!req.authUser) throw new HttpError(401, "Authentication required");
    const poll = await findPollByCode(getCodeParam(req));
    if (poll.createdBy.toString() !== req.authUser.id) {
      throw new HttpError(403, "Forbidden");
    }
    poll.isClosed = true;
    await poll.save();
    const results = await getPollResults(poll);
    res.json(results);
  }
);

app.delete(
  "/api/polls/:code",
  requireAuth,
  requireRole("teacher"),
  async (req: AuthRequest<{ code: string }>, res: Response) => {
    if (!req.authUser) throw new HttpError(401, "Authentication required");
    const poll = await findPollByCode(getCodeParam(req));
    if (poll.createdBy.toString() !== req.authUser.id) {
      throw new HttpError(403, "Forbidden");
    }
    await Vote.deleteMany({ pollId: poll._id });
    await Poll.deleteOne({ _id: poll._id });
    res.status(204).send();
  }
);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  if (error instanceof Error) {
    res.status(500).json({ message: error.message });
    return;
  }
  res.status(500).json({ message: "Unexpected server error" });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`PollClass API running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });
