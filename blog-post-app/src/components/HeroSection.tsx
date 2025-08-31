
import { makeStyles } from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    width: "100vw",
    minHeight: "100vh",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    background: "linear-gradient(135deg, #eff6ff 0%, #bae6fd 100%)",
    color: "#1e3a8a",
    padding: 0,
    margin: 0,
    boxSizing: "border-box",
    '@media (prefers-color-scheme: dark)': {
      background: "linear-gradient(135deg, #171717 0%, #262626 100%)",
      color: "#fff",
    },
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    marginBottom: "1rem",
    color: "#1e3a8a",
    '@media (prefers-color-scheme: dark)': {
      color: "#fff",
    },
    '@media (min-width: 768px)': {
      fontSize: "3.5rem",
    },
  },
  subtitle: {
    maxWidth: "37.5rem", // 600px
    fontSize: "1.25rem",
    color: "#1e40af",
    margin: "0 auto 2rem auto",
    '@media (prefers-color-scheme: dark)': {
      color: "#d1d5db",
    },
    '@media (min-width: 768px)': {
      fontSize: "2rem",
    },
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    justifyContent: "center",
    alignItems: "center",
    '@media (min-width: 640px)': {
      flexDirection: "row",
    },
  },
  buttonPrimary: {
    padding: "0.75rem 2rem",
    borderRadius: "9999px",
    background: "#1d4ed8",
    color: "#fff",
    fontWeight: 600,
    boxShadow: "0 2px 8px 0 rgba(30,64,175,0.10)",
    border: "none",
    cursor: "pointer",
    transition: "background 0.2s",
    textDecoration: "none",
    ':hover': {
      background: "#1e40af",
    },
  },
  buttonSecondary: {
    padding: "0.75rem 2rem",
    borderRadius: "9999px",
    border: "2px solid #1d4ed8",
    color: "#1d4ed8",
    background: "transparent",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    textDecoration: "none",
    ':hover': {
      background: "#1d4ed8",
      color: "#fff",
    },
    '@media (prefers-color-scheme: dark)': {
      color: "#fff",
      border: "2px solid #fff",
      ':hover': {
        background: "#fff",
        color: "#1d4ed8",
      },
    },
  },
});

const HeroSection: React.FC = () => {
  const styles = useStyles();
  return (
    <section className={styles.root}>
      <h1 className={styles.title}>Welcome to Lumora</h1>
      <p className={styles.subtitle}>
        Discover insightful articles, tutorials, and resources on React, Fluent UI, and modern web development.
      </p>
      <div className={styles.actions}>
        <a href="/blogs" className={styles.buttonPrimary}>
          Featured Posts
        </a>
        <a href="/about" className={styles.buttonSecondary}>
          About Us
        </a>
      </div>
    </section>
  );
};

export default HeroSection;
