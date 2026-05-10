import { Types } from "mongoose";
import { Plan } from "../models/plan.js";
import { User } from "../models/userBasic.js";

/* ==========================================================
 * Tokenization + similarity (deterministic, no LLM)
 * ========================================================== */

const STOP_WORDS = new Set([
  // PL
  "ale", "bardzo", "być", "była", "był", "były", "być", "co", "czy", "dla",
  "do", "i", "ich", "jak", "jako", "jest", "jestem", "już", "lub", "moja",
  "moje", "może", "na", "nie", "od", "po", "przez", "się", "tak", "też",
  "to", "tym", "we", "z", "za", "ze", "że", "który", "która", "które",
  "chcę", "chciałbym", "chcial", "chce", "swoje", "swoją", "swoich",
  "tylko", "albo", "może", "umiem", "wszystko",
  // EN
  "the", "a", "an", "of", "in", "to", "and", "or", "for", "with", "on",
  "is", "are", "was", "were", "be", "been", "being", "by", "as", "at",
  "from", "but", "this", "that", "these", "those", "i", "you", "we",
  "they", "my", "your", "our", "their", "want", "would", "like", "learn",
  "build", "first", "develop", "use", "using",
]);

function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    // strip diacritics so "się" / "se" / "framework" / "frameworków" map closer
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
  return new Set(tokens);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function shared(a: Set<string>, b: Set<string>, max = 8): string[] {
  const out: string[] = [];
  for (const t of a) {
    if (b.has(t)) out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function buildSignature(plan: { topicSummary: string; input: { goalText: string } }): Set<string> {
  return tokenize(`${plan.input.goalText} ${plan.topicSummary}`);
}

/* ==========================================================
 * Match service
 * ========================================================== */

export interface Match {
  userId: string;
  login: string;
  name: string;
  surname: string;
  planTopic: string;
  weeklyFocus: string;
  currentLevel: string;
  similarity: number;
  sharedKeywords: string[];
}

export class MatchService {
  /**
   * Returns up to `limit` other learners whose latest plan most overlaps
   * with the current user's latest plan, restricted to people who opted
   * into community matching (input.wantsCommunity === true).
   */
  async findMatches(userId: string, limit = 10): Promise<Match[]> {
    if (!Types.ObjectId.isValid(userId)) return [];

    const myPlan = await Plan.findOne({ userId }).sort({ createdAt: -1 }).lean();
    if (!myPlan) return [];

    const mySig = buildSignature(myPlan);

    const meId = new Types.ObjectId(userId);
    const candidates = await Plan.aggregate<{
      userId: Types.ObjectId;
      topicSummary: string;
      weeklyFocus: string;
      input: { goalText: string; currentLevel: string; wantsCommunity: boolean };
    }>([
      {
        $match: {
          userId: { $ne: meId },
          "input.wantsCommunity": true,
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$userId",
          plan: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$plan" } },
    ]);

    if (candidates.length === 0) return [];

    const ranked = candidates
      .map((p) => {
        const sig = buildSignature(p);
        return {
          plan: p,
          sig,
          similarity: jaccard(mySig, sig),
        };
      })
      .filter((x) => x.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    if (ranked.length === 0) return [];

    const userIds = ranked.map((r) => r.plan.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select("login name surname")
      .lean<{ _id: Types.ObjectId; login: string; name: string; surname: string }[]>();
    const userById = new Map(users.map((u) => [String(u._id), u]));

    return ranked
      .map((r): Match | null => {
        const u = userById.get(String(r.plan.userId));
        if (!u) return null;
        return {
          userId: String(r.plan.userId),
          login: u.login,
          name: u.name,
          surname: u.surname,
          planTopic: r.plan.topicSummary,
          weeklyFocus: r.plan.weeklyFocus,
          currentLevel: r.plan.input.currentLevel,
          similarity: Number(r.similarity.toFixed(3)),
          sharedKeywords: shared(mySig, r.sig),
        };
      })
      .filter((m): m is Match => m !== null);
  }
}

export const matchService = new MatchService();
