/**
 * Dashboard: default home after login; question list, quick actions, URL-driven search.
 * Data: `questionService` (keyword `q`, semantic `semantic`, or full list).
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Edit3, BarChart3, FileText } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { questionService } from "../../services/question/question.service.js";
import QuestionCard from "../../components/QuestionCard/QuestionCard.jsx";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const searchQuery = queryParams.get("q") || queryParams.get("semantic") || "";
  const searchMode = queryParams.get("semantic")
    ? "AI semantic"
    : queryParams.get("q")
      ? "Keyword"
      : "All";

  useEffect(() => {
    let isCancelled = false;

    async function loadQuestions() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await questionService.getQuestions({
          search: searchQuery,
        });
        if (!isCancelled) {
          setQuestions(data?.data || data || []);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError?.message || "Failed to load questions.");
          setQuestions([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadQuestions();

    return () => {
      isCancelled = true;
    };
  }, [searchQuery]);

  const stats = useMemo(() => {
    const total = questions.length;
    const replies = questions.reduce(
      (sum, question) => sum + (question.answerCount || 0),
      0,
    );
    const unanswered = questions.filter(
      (q) => (q.answerCount || 0) === 0,
    ).length;
    const yours = questions.filter(
      (q) => String(q.author?.id) === String(user?.id || user?.userId),
    ).length;

    return [
      { label: "Questions", value: total },
      { label: "Replies", value: replies },
      { label: "Unanswered", value: unanswered },
      { label: "Yours", value: yours },
    ];
  }, [questions, user]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className={styles.skeletonContainer}>
          {/* Animated Spinner Ring */}
          <div className={styles.spinner} role="status" aria-label="loading" />
          <div className={styles.loadingStateText}>
            Loading recent questions...
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorBoxInner}>Failed to load questions.</div>
        </div>
      );
    }

    if (questions.length === 0) {
      return (
        <div className={styles.emptyContainer}>
          <div className={styles.emptyBoxInner}>
            No questions found. Be the first to ask!
          </div>
        </div>
      );
    }

    return (
      <div className={styles.list}>
        {questions.map((question) => (
          <QuestionCard
            key={question.id ?? question.questionHash}
            question={question}
            currentUser={user}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      {/* ─── Upper Unified Dashboard Control Card ────────────────────────── */}
      <div className={styles.mainContentCard}>
        {/* Welcome Section */}
        <div className={styles.hero__copy}>
          <p className={styles.hero__eyebrow}>Forum Home</p>
          <h1 className={styles.hero__title}>
            Good to see you, {user?.firstName || "learner"}.
          </h1>
          <p className={styles.hero__description}>
            Start a topic, revisit your own threads, or skim the live feed.
            Search above works from any page once you are back on Home.
          </p>
        </div>

        {/* Quick Action Item Rows */}
        <div className={styles.hero__quickActions}>
          <button
            type="button"
            className={styles.quickAction}
            onClick={() => navigate("/questions/ask")}
          >
            <span className={styles.quickAction__icon}>
              <Edit3 size={18} />
            </span>
            <div className={styles.quickAction__text}>
              <p className={styles.quickAction__label}>New question</p>
              <p className={styles.quickAction__detail}>
                Share context, errors, and what you already tried
              </p>
            </div>
          </button>

          <button
            type="button"
            className={styles.quickAction}
            onClick={() => navigate("/my-questions")}
          >
            <span className={styles.quickAction__icon}>
              <BarChart3 size={18} />
            </span>
            <div className={styles.quickAction__text}>
              <p className={styles.quickAction__label}>Your topics</p>
              <p className={styles.quickAction__detail}>
                Filtered list of threads you authored
              </p>
            </div>
          </button>

          <button
            type="button"
            className={styles.quickAction}
            onClick={() => navigate("/rag-documents")}
          >
            <span className={styles.quickAction__icon}>
              <FileText size={18} />
            </span>
            <div className={styles.quickAction__text}>
              <p className={styles.quickAction__label}>Knowledge base</p>
              <p className={styles.quickAction__detail}>
                Course library, uploads, and retrieval-backed context for
                threads
              </p>
            </div>
          </button>
        </div>

        <hr className={styles.decorativeDivider} />

        <p className={styles.statsIntroText}>
          Figures below describe the newest threads in this feed (up to 100 from
          the API).
        </p>

        {/* Metric Overview Panels */}
        <div className={styles.statsGrid}>
          {stats.map((stat) => (
            <div key={stat.label} className={styles.statCard}>
              <p className={styles.statCard__label}>{stat.label}</p>
              <p className={styles.statCard__value}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Lower Discussion Feed Card ─────────────────────────────────── */}
      <section className={styles.feedCardContainer}>
        <div className={styles.statsHeader}>
          <div>
            <h2 className={styles.statsHeader__title}>Discussion feed</h2>
            <p className={styles.statsHeader__subtitle}>
              {searchQuery
                ? `Showing ${searchMode} search results for “${searchQuery}”.`
                : "Your threads use a slim left accent in this list."}
            </p>
          </div>

          <div className={styles.feedBadgeButton}>
            <span>Newest Threads</span>
          </div>
        </div>

        <div className={styles.listPanel} aria-live="polite">
          {renderContent()}
        </div>
      </section>
    </div>
  );
}
