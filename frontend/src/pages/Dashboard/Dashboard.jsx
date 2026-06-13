/**
 * Dashboard: default home after login; question list, quick actions, URL-driven search.
 * Data: `questionService` (keyword `q`, semantic `semantic`, or full list).
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, MessageCircle, Sparkles } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { questionService } from "../../services/question/question.service.js";
import QuestionCard from "../../components/QuestionCard/QuestionCard.jsx";
import pageStates from "../../styles/pageStates.module.css";
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
          setQuestions(data);
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
      (q) => String(q.author?.id) === String(user?.id),
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
        <div
          className={`${pageStates.pageStates__message} ${pageStates["pageStates__message--loading"]}`}
        >
          Loading snapshot for the list below...
        </div>
      );
    }

    if (error) {
      return (
        <div
          className={`${pageStates.pageStates__message} ${pageStates["pageStates__message--error"]}`}
          role="alert"
        >
          {error}
        </div>
      );
    }

    if (questions.length === 0) {
      return (
        <div
          className={`${pageStates.pageStates__message} ${pageStates["pageStates__message--empty"]}`}
        >
          No questions found. Be the first to ask! Use the search bar above or
          create a new question.
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
      <section className={styles.hero}>
        <div className={styles.hero__copy}>
          <p className={styles.hero__eyebrow}>Forum home</p>
          <h1 className={styles.hero__title}>
            Good to see you, {user?.firstName || "learner"}.
          </h1>
          <p className={styles.hero__description}>
            Start a topic, revisit your own threads, or skim the live feed.
            Search above works from any page once you are back on Home.
          </p>
        </div>

        <div className={styles.hero__quickActions}>
          <button
            type="button"
            className={styles.quickAction}
            onClick={() => navigate("/questions/ask")}
          >
            <span className={styles.quickAction__icon}>
              <ArrowRight size={18} />
            </span>
            <div>
              <p className={styles.quickAction__label}>New question</p>
              <p className={styles.quickAction__detail}>
                Share context, errors, and what you already tried.
              </p>
            </div>
          </button>

          <button
            type="button"
            className={styles.quickAction}
            onClick={() => navigate("/my-questions")}
          >
            <span className={styles.quickAction__icon}>
              <MessageCircle size={18} />
            </span>
            <div>
              <p className={styles.quickAction__label}>Your topics</p>
              <p className={styles.quickAction__detail}>
                Filtered list of threads you authored.
              </p>
            </div>
          </button>

          <button
            type="button"
            className={styles.quickAction}
            onClick={() => navigate("/rag-documents")}
          >
            <span className={styles.quickAction__icon}>
              <BookOpen size={18} />
            </span>
            <div>
              <p className={styles.quickAction__label}>Knowledge base</p>
              <p className={styles.quickAction__detail}>
                Course library, uploads, and retrieval-backed context.
              </p>
            </div>
          </button>
        </div>
      </section>

      <section className={styles.statsSection}>
        <div className={styles.statsHeader}>
          <div>
            <p className={styles.statsHeader__eyebrow}>Forum snapshot</p>
            <h2 className={styles.statsHeader__title}>Discussion feed</h2>
            <p className={styles.statsHeader__subtitle}>
              {searchQuery
                ? `Showing ${searchMode} search results for “${searchQuery}”.`
                : "Your threads use a slim left accent in this list."}
            </p>
          </div>

          <div className={styles.statsHeader__meta}>
            <Sparkles size={16} />
            <span>{questions.length} threads loaded</span>
          </div>
        </div>

        <div className={styles.statsGrid}>
          {stats.map((stat) => (
            <div key={stat.label} className={styles.statCard}>
              <p className={styles.statCard__label}>{stat.label}</p>
              <p className={styles.statCard__value}>{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.listPanel} aria-live="polite">
        {renderContent()}
      </section>
    </div>
  );
}
