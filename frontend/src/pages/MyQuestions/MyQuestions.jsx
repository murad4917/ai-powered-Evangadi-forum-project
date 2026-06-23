/**
 * MyQuestions: Displays only the questions authored by the currently authenticated user.
 * Integrates with `questionService.getQuestions({ mine: true })`.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Clock, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { questionService } from '../../services/question/question.service';
import styles from './MyQuestions.module.css';

/* ── Helpers ──────────────────────────────────────────────────────────── */

/** Deterministic palette matching Dashboard.jsx */
const AVATAR_COLORS = [
  '#f97316', '#10b981', '#3b82f6', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
];

function getAvatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(firstName = '', lastName = '') {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString)) / 1000);
  const intervals = [
    { label: 'year', secs: 31536000 },
    { label: 'month', secs: 2592000 },
    { label: 'week', secs: 604800 },
    { label: 'day', secs: 86400 },
    { label: 'hour', secs: 3600 },
    { label: 'minute', secs: 60 },
  ];
  for (const { label, secs } of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count !== 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

/* ── Component ────────────────────────────────────────────────────────── */

export default function MyQuestions() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

    useEffect(() => {
    async function fetchMyQuestions() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await questionService.getQuestions({ mine: true });
        setQuestions(result?.data || result || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch questions.');
        setQuestions([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMyQuestions(); 
  }, []); 



  const userFullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const avatarInitials = getInitials(user?.firstName, user?.lastName);
  const avatarBgColor = getAvatarColor(userFullName);

  return (
    <div className={styles.container}>
      {/* Workspace Header Card */}
      <section className={styles.headerCard}>
        <div className={styles.headerCard__content}>
          <p className={styles.headerCard__label}>Your workspace</p>
          <h1 className={styles.headerCard__title}>Your topics</h1>
          <p className={styles.headerCard__subtitle}>
            Only questions you created. Open one to read answers or add follow-ups. Rows use the same
            left accent as your threads on Home.
          </p>
        </div>
        <Link
          to="/questions/ask"
          className={styles.newQuestionBtn}
          id="new-question-workspace-btn"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>New question</span>
        </Link>
      </section>

      {/* Main Content Area */}
      {isLoading && (
        <div className={styles.stateWrapper} id="my-questions-loading">
          <p className={styles.loadingText}>Loading your questions...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className={styles.stateWrapper} id="my-questions-error">
          <div className={styles.errorBox} role="alert">
            {error}
          </div>
        </div>
      )}

      {!isLoading && !error && questions.length === 0 && (
        <div className={styles.stateWrapper} id="my-questions-empty">
          <div className={styles.emptyBox}>
            <p className={styles.emptyText}>
              You have not asked any questions yet. Use Ask a Question in the sidebar to start.
            </p>
          </div>
        </div>
      )}

      {!isLoading && !error && questions.length > 0 && (
        <section className={styles.questionsList} id="my-questions-feed">
          {questions.map((q) => (
            <Link
              key={q.questionHash || q.id}
              to={`/question/${q.questionHash}`}
              className={styles.questionCard}
              id={`my-question-${q.questionHash}`}
            >
              {/* Avatar */}
              <div
                className={styles.questionCard__avatar}
                style={{ backgroundColor: avatarBgColor }}
              >
                {avatarInitials}
              </div>

              {/* Card Body */}
              <div className={styles.questionCard__body}>
                <div className={styles.questionCard__titleRow}>
                  <h4 className={styles.questionCard__title}>{q.title}</h4>
                  <span className={styles.questionCard__yoursBadge}>Yours</span>
                </div>

                {q.content && <p className={styles.questionCard__excerpt}>{q.content}</p>}

                <div className={styles.questionCard__meta}>
                  <span className={styles.questionCard__metaItem}>
                    <MessageSquare size={12} />
                    {Number(q.answerCount) || 0}{' '}
                    {Number(q.answerCount) === 1 ? 'reply' : 'replies'}
                  </span>
                  <span className={styles.questionCard__metaItem}>
                    <Clock size={12} />
                    {timeAgo(q.createdAt)}
                  </span>
                  <span className={styles.questionCard__metaItem}>by You</span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
