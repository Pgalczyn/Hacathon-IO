import {
  generateWeeklyPlan,
  type OnboardingInput,
  type PlanResponse,
  type LearningTask,
} from "../llm/index.js";
import { materialsService, type MaterialBundle } from "./materials.service.js";
import { planService } from "./plan.service.js";
import { recommendationService } from "./recommendation.service.js";
import { longTermPlanService } from "./longTermPlan.service.js";

const STOPWORDS = new Set([
  "a", "an", "the", "of", "to", "for", "and", "or", "in", "on", "with",
  "by", "is", "are", "be", "this", "that", "intro", "introduction", "your",
]);

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

interface MaterialRef {
  title: string;
  source: string;
  url: string;
}

/** Pick the best matching material for a task title, or null when no
 *  match is reasonable. The LLM is told never to invent URLs, so most
 *  tasks come back with url=null; we fill them from the real materials
 *  fetched in parallel from YouTube / Gutendex / OpenAlex. */
function bestMatch(taskTitle: string, candidates: MaterialRef[]): MaterialRef | null {
  if (candidates.length === 0) return null;
  const taskTokens = tokenize(taskTitle);
  let best: { ref: MaterialRef; score: number } | null = null;
  for (const c of candidates) {
    const score = jaccard(taskTokens, tokenize(c.title));
    if (!best || score > best.score) best = { ref: c, score };
  }
  return best && best.score >= 0.15 ? best.ref : null;
}

/** Mutates each task with a real URL when possible, otherwise a Google
 *  search URL so every card stays clickable. Format-aware: video tasks
 *  pull from YouTube; book tasks from Gutendex; article/course/etc.
 *  fall back to academic papers first, then Google. */
function enrichTasksWithUrls(tasks: LearningTask[], materials: MaterialBundle): void {
  const videoCandidates: MaterialRef[] = materials.videos.map((v) => ({
    title: v.title,
    source: "YouTube",
    url: v.embedUrl,
  }));
  const bookCandidates: MaterialRef[] = materials.books
    .filter((b) => b.readUrl)
    .map((b) => ({ title: b.title, source: b.author || "Project Gutenberg", url: b.readUrl! }));
  const paperCandidates: MaterialRef[] = materials.academic_papers
    .filter((p) => p.pdfUrl)
    .map((p) => ({
      title: p.title,
      source: `${p.author}${p.year ? ` · ${p.year}` : ""}`,
      url: p.pdfUrl!,
    }));

  for (const task of tasks) {
    if (task.url) continue; // LLM was confident, leave alone

    let match: MaterialRef | null = null;
    if (task.format === "video") {
      match = bestMatch(task.title, videoCandidates);
    } else if (task.format === "book") {
      match = bestMatch(task.title, bookCandidates);
    } else {
      // article / course / podcast / interview / exercise — try academic
      // first (most relevant for "article"), then video, then book.
      match =
        bestMatch(task.title, paperCandidates) ??
        bestMatch(task.title, videoCandidates) ??
        bestMatch(task.title, bookCandidates);
    }

    if (match) {
      task.url = match.url;
      if (!task.source) task.source = match.source;
    } else {
      // Fallback so the user always has SOMETHING to click.
      const q = encodeURIComponent(task.title);
      task.url = `https://www.google.com/search?q=${q}`;
    }
  }
}

export interface OnboardingResponse {
  validation: PlanResponse["validation"];
  plan: PlanResponse["plan"];
  materials: MaterialBundle | null;
  /** Mongo `_id` of the persisted Plan, or null if anonymous / save failed. */
  planId: string | null;
  /** Mongo `_id` of the persisted yearly LongTermPlan, or null. */
  longTermPlanId: string | null;
}

export interface RunOptions {
  /** When set, the generated plan is persisted under this user. */
  userId?: string;
}

export class OnboardingService {
  /**
   * Validates the user's goal via LLM, then (only if accepted) fetches real
   * learning materials from external APIs (YouTube / Gutendex / OpenAlex) and,
   * when a userId is supplied, persists the result.
   */
  async run(input: OnboardingInput, options: RunOptions = {}): Promise<OnboardingResponse> {
    console.log("[onboarding] start, userId:", options.userId ?? "(anon)");
    let learnerContext: string | undefined;
    if (options.userId) {
      try {
        const ctx = await recommendationService.buildPromptContext(options.userId);
        learnerContext = ctx ?? undefined;
        console.log("[onboarding] insights built, length:", ctx?.length ?? 0);
      } catch (err) {
        console.warn("Failed to build learner insights:", err instanceof Error ? err.message : err);
      }
    }

    console.log("[onboarding] calling LLM...");
    const planResponse = await generateWeeklyPlan(
      input,
      learnerContext ? { learnerContext } : {},
    );
    console.log("[onboarding] LLM done, accepted:", planResponse.validation.accepted);

    if (!planResponse.validation.accepted || !planResponse.plan) {
      return {
        validation: planResponse.validation,
        plan: null,
        materials: null,
        planId: null,
        longTermPlanId: null,
      };
    }

    const topic = planResponse.plan.topic_summary ?? input.goalText;
    const materials = await materialsService.fetchByTopic(topic);

    // Attach real URLs to tasks (or Google fallback) so every card in the
    // UI is clickable. Mutates planResponse.plan.tasks in place.
    enrichTasksWithUrls(planResponse.plan.tasks, materials);

    let planId: string | null = null;
    let longTermPlanId: string | null = null;
    if (options.userId) {
      try {
        const saved = await planService.save({
          userId: options.userId,
          input,
          plan: planResponse.plan,
          materials,
        });
        planId = String(saved._id);
      } catch (err) {
        // Persistence is best-effort: if Mongo is down or save fails, still
        // return the plan to the client. The caller will see planId=null.
        console.warn("Failed to persist plan:", err instanceof Error ? err.message : err);
      }

      // Kick off yearly plan generation in the background — don't make the
      // caller wait 30-60 more seconds. The /learning page polls /longplan
      // when it loads, so the calendar shows up as soon as the LLM finishes.
      // If this fails, the user can retry from the calendar's empty state.
      console.log("[onboarding] kicking off yearly plan in background...");
      void longTermPlanService
        .generateForUser({
          userId: options.userId,
          goalText: input.goalText,
          currentLevel: input.currentLevel,
          preferredFormats: input.preferredFormats,
        })
        .then((longPlan) => {
          console.log("[onboarding] yearly plan saved (bg):", String(longPlan._id));
        })
        .catch((err) => {
          console.warn(
            "[onboarding] background yearly plan failed:",
            err instanceof Error ? err.message : err,
          );
        });
    }

    return {
      validation: planResponse.validation,
      plan: planResponse.plan,
      materials,
      planId,
      longTermPlanId,
    };
  }

  /** Replace the user's current draft (if any) with a fresh draft generated
   *  from the same input that was used last time. Use when a user wants a
   *  different take on the proposed week without retyping the form. */
  async regenerateForUser(userId: string): Promise<OnboardingResponse> {
    const input = await planService.getLastInput(userId);
    if (!input) {
      throw new Error("No previous plan to regenerate from — fill the onboarding form first.");
    }
    await planService.deleteDrafts(userId);
    return this.run(input, { userId });
  }

  /** Mark the user's current accepted plan as completed (week is over) and
   *  generate next week's draft from the same input. The recommendation
   *  service will fold in their latest reviews automatically. */
  async nextWeekForUser(userId: string): Promise<OnboardingResponse> {
    const input = await planService.getLastInput(userId);
    if (!input) {
      throw new Error("No previous plan — fill the onboarding form first.");
    }
    await planService.complete(userId); // no-op if nothing accepted; harmless
    return this.run(input, { userId });
  }
}

export const onboardingService = new OnboardingService();
