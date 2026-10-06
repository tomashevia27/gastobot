import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <p className={styles.eyebrow}>GastoBot · Inicio local</p>
        <h1>Un lugar para tus gastos</h1>
        <p>La base del proyecto está lista. El registro manual de gastos será la primera función.</p>
      </div>
    </main>
  );
}
