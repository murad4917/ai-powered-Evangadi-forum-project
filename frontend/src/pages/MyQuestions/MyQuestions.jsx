/**
 * My Questions: personalized list of threads authored by the signed-in user.
 * Data: `questionService.getQuestions({ mine: true })`.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { questionService } from '../../services/question/question.service.js';
import QuestionCard from '../../components/QuestionCard/QuestionCard.jsx';
import pageStates from '../../styles/pageStates.module.css';
import styles from './MyQuestions.module.css';

export default function MyQuestions() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [myQuestions, setMyQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMyQuestions() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await questionService.getQuestions({ mine: true });
        if (!cancelled) {
          setMyQuestions(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Failed to fetch questions.');
          setMyQuestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadMyQuestions();

    return () => {
      cancelled = true;
    };
  }, []);

  const renderListContent = () => {
    if (isLoading) {
      return (
        <div
          className={`${pageStates.pageStates__message} ${pageStates['pageStates__message--loading']}`}
        >
          Loading your questions...
        </div>
      );
    }

    if (error) {
      return (
        <div
          className={`${pageStates.pageStates__message} ${pageStates['pageStates__message--error']}`}
          role='alert'
        >
          {error}
        </div>
      );
    }

    if (myQuestions.length === 0) {
      return (
        <div
          className={`${pageStates.pageStates__message} ${pageStates['pageStates__message--empty']}`}
        >
          You have not asked any questions yet. Use Ask a Question in the sidebar
          to start.
        </div>
      );
    }

    return (
      <div className={styles.list}>
        {myQuestions.map(question => (
          <QuestionCard
            key={question.id ?? question.questionHash}
            question={question}
            currentUser={user}
            showYoursBadge
          />
        ))}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <section className={styles.header} aria-labelledby='my-questions-title'>
        <div className={styles.header__copy}>
          <p className={styles.header__eyebrow}>Your workspace</p>
          <h1 id='my-questions-title' className={styles.header__title}>
            Your topics
          </h1>
          <p className={styles.header__description}>
            Only questions you created. Open one to read answers or add
            follow-ups. Rows use the same left accent as your threads on Home.
          </p>
        </div>

        <button
          type='button'
          className={styles.header__action}
          onClick={() => navigate('/questions/ask')}
        >
          <Plus size={16} aria-hidden />
          New question
        </button>
      </section>

      <section className={styles.listPanel} aria-live='polite'>
        {renderListContent()}
      </section>
    </div>
  );
}
