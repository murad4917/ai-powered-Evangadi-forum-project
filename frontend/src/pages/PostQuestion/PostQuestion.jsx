/**
 * Post Question Page: Allows users to ask new questions with AI Draft Coach feedback.
 * Route: /questions/ask
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Send, X } from 'lucide-react';
import { createQuestion, generateQuestionDraftCoach } from '../../services/question/question.service';
import styles from './PostQuestion.module.css';

export default function PostQuestion() {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [errors, setErrors] = useState({});

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCoaching, setIsCoaching] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [coachFeedback, setCoachFeedback] = useState(null);

  // Message state
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  /**
   * Validates form inputs
   */
  const validateForm = (data = formData, showAllErrors = false) => {
    const newErrors = {};

    if (!data.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (data.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }

    if (!data.content.trim()) {
      newErrors.content = 'Content is required';
    } else if (data.content.trim().length < 10) {
      newErrors.content = 'Content must be at least 10 characters';
    }

    if (showAllErrors) {
      setErrors(newErrors);
    }
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles form input changes
   */
  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    setError(null);
  };

  /**
   * Requests AI Draft Coach feedback
   */
  const handleGetCoachFeedback = async () => {
    if (!validateForm()) {
      setErrors({
        title: formData.title.trim().length < 5 ? 'Title must be at least 5 characters' : '',
        content: formData.content.trim().length < 10 ? 'Content must be at least 10 characters' : '',
      });
      return;
    }

    setIsCoaching(true);
    setError(null);

    try {
      const result = await generateQuestionDraftCoach({
        title: formData.title.trim(),
        content: formData.content.trim(),
      });

      setCoachFeedback(result);
      setShowCoach(true);
    } catch (err) {
      setError(err.message || 'Failed to get AI feedback. Please try again.');
    } finally {
      setIsCoaching(false);
    }
  };

  /**
   * Submits the question form
   */
  const handleSubmit = async e => {
    e.preventDefault();

    if (!validateForm(formData, true)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createQuestion({
        title: formData.title.trim(),
        content: formData.content.trim(),
      });

      // Show success state with question data
      setSuccessData(result);
    } catch (err) {
      setError(err.message || 'Failed to post question. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles success actions
   */
  const handleViewQuestion = () => {
    if (successData?.questionId || successData?.id) {
      navigate(`/question/${successData.questionId || successData.id}`);
    }
  };

  const handleAskAnother = () => {
    setFormData({ title: '', content: '' });
    setErrors({});
    setShowCoach(false);
    setCoachFeedback(null);
    setSuccessData(null);
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  /**
   * Renders the success overlay modal
   */
  if (successData) {
    return (
      <div className={styles.postQuestion__successOverlay}>
        <div className={styles.postQuestion__successContent}>
          <div className={styles.postQuestion__successIcon}>✨</div>
          <h2 className={styles.postQuestion__successTitle}>
            Thread Published!
          </h2>
          <p className={styles.postQuestion__successMessage}>
            Your question has been posted successfully.
          </p>
          <div className={styles.postQuestion__successActions}>
            <button
              className={`${styles.postQuestion__button} ${styles['postQuestion__button--primary']}`}
              onClick={handleViewQuestion}
            >
              View Question
            </button>
            <button
              className={`${styles.postQuestion__button} ${styles['postQuestion__button--secondary']}`}
              onClick={handleAskAnother}
            >
              Ask Another
            </button>
            <button
              className={`${styles.postQuestion__button} ${styles['postQuestion__button--secondary']}`}
              onClick={handleGoToDashboard}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.postQuestion}>
      {/* Header */}
      <div className={styles.postQuestion__header}>
        <h1 className={styles.postQuestion__title}>Ask a Question</h1>
        <p className={styles.postQuestion__subtitle}>
          Share your question with the community and get answers from experts.
        </p>
      </div>

      {/* Guidelines */}
      <div className={styles.postQuestion__guidelines}>
        <h3 className={styles.postQuestion__guidelinesTitle}>
          Guidelines for a Good Question
        </h3>
        <ul className={styles.postQuestion__guidelinesList}>
          <li className={styles.postQuestion__guidelinesItem}>
            Keep your title clear and concise
          </li>
          <li className={styles.postQuestion__guidelinesItem}>
            Provide enough context in the description
          </li>
          <li className={styles.postQuestion__guidelinesItem}>
            Use simple, direct language
          </li>
          <li className={styles.postQuestion__guidelinesItem}>
            Use our AI suggestions to improve your question
          </li>
        </ul>
      </div>

      {/* Error Message */}
      {error && <div className={styles.postQuestion__error}>{error}</div>}

      {/* Form */}
      <form className={styles.postQuestion__form} onSubmit={handleSubmit}>
        {/* Title Input */}
        <div className={styles.postQuestion__formGroup}>
          <label className={styles.postQuestion__label} htmlFor='title'>
            Question Title *
          </label>
          <input
            id='title'
            type='text'
            name='title'
            value={formData.title}
            onChange={handleInputChange}
            placeholder='What is your question about?'
            className={`${styles.postQuestion__input} ${styles.postQuestion__titleInput}`}
            disabled={isSubmitting || isCoaching}
          />
          <div className={styles.postQuestion__charCount}>
            {formData.title.length} / 5 (minimum)
          </div>
          {errors.title && (
            <div className={styles.postQuestion__validationError}>
              {errors.title}
            </div>
          )}
        </div>

        {/* Content Textarea */}
        <div className={styles.postQuestion__formGroup}>
          <label className={styles.postQuestion__label} htmlFor='content'>
            Question Description *
          </label>
          <textarea
            id='content'
            name='content'
            value={formData.content}
            onChange={handleInputChange}
            placeholder='Provide more details about your question. Include any relevant context or code snippets.'
            className={styles.postQuestion__textarea}
            disabled={isSubmitting || isCoaching}
          />
          <div className={styles.postQuestion__charCount}>
            {formData.content.length} / 10 (minimum)
          </div>
          {errors.content && (
            <div className={styles.postQuestion__validationError}>
              {errors.content}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.postQuestion__actions}>
          <button
            type='button'
            className={`${styles.postQuestion__button} ${styles['postQuestion__button--secondary']}`}
            onClick={handleGetCoachFeedback}
            disabled={isSubmitting || isCoaching}
          >
            {isCoaching ? (
              <>
                <span className={styles.postQuestion__loader} />
                Getting Suggestions...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                AI Suggestions
              </>
            )}
          </button>

          <button
            type='submit'
            className={`${styles.postQuestion__button} ${styles['postQuestion__button--primary']}`}
            disabled={isSubmitting || isCoaching}
          >
            {isSubmitting ? (
              <>
                <span className={styles.postQuestion__loader} />
                Posting...
              </>
            ) : (
              <>
                <Send size={18} />
                Post Question
              </>
            )}
          </button>

          <button
            type='button'
            className={`${styles.postQuestion__button} ${styles['postQuestion__button--secondary']}`}
            onClick={() => navigate('/dashboard')}
            disabled={isSubmitting || isCoaching}
          >
            <X size={18} />
            Cancel
          </button>
        </div>
      </form>

      {/* AI Coach Feedback Panel */}
      {showCoach && coachFeedback && (
        <div className={styles.postQuestion__coachPanel}>
          <div className={styles.postQuestion__coachHeader}>
            <Sparkles size={20} style={{ color: 'var(--primary)' }} />
            <h3 className={styles.postQuestion__coachTitle}>
              AI Suggestions for Your Question
            </h3>
          </div>
          <div className={styles.postQuestion__coachTips}>
            {coachFeedback.tips && Array.isArray(coachFeedback.tips) ? (
              coachFeedback.tips.map((tip, index) => (
                <div key={index} className={styles.postQuestion__coachTip}>
                  {tip}
                </div>
              ))
            ) : (
              <div className={styles.postQuestion__coachTip}>
                {coachFeedback.tips || 'Your question looks great!'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
