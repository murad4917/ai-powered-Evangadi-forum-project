import React from "react";
import styles from "./MyQuestions.module.css";

export default function MyQuestions() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Questions</h1>
      <p className={styles.lead}>Your posted questions will appear here.</p>
    </div>
  );
}
