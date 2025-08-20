
import type { FC } from "react";
import { Card, CardHeader, CardPreview, Body1, makeStyles } from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    width: "100vw",
    height: "100vh",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f3f4f6 0%, #e0e7ef 100%)",
    '@media (prefers-color-scheme: dark)': {
      background: "linear-gradient(135deg, #171717 0%, #262626 100%)",
    },
  },
  card: {
    maxWidth: "420px",
    width: "100%",
    padding: "2.5rem 2rem 2rem 2rem",
    borderRadius: "1.5rem",
    boxShadow: "0 4px 32px 0 rgba(30,64,175,0.10)",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    '@media (prefers-color-scheme: dark)': {
      background: "#23272f",
    },
  },
  avatar: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    objectFit: "cover",
    margin: "0 auto 1.5rem auto",
    boxShadow: "0 2px 8px 0 rgba(30,64,175,0.10)",
    border: "4px solid #1d4ed8",
    '@media (prefers-color-scheme: dark)': {
      border: "4px solid #fff",
    },
  },
  name: {
    fontSize: "2rem",
    fontWeight: 700,
    margin: "0 0 1rem 0",
    textAlign: "center",
    color: "#1e3a8a",
    '@media (prefers-color-scheme: dark)': {
      color: "#fff",
    },
  },
  bio: {
    fontSize: "1.1rem",
    color: "#374151",
    textAlign: "center",
    margin: "0 0 0.5rem 0",
    '@media (prefers-color-scheme: dark)': {
      color: "#d1d5db",
    },
  },
});

const About: FC = () => {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <Card className={styles.card}>
        <CardPreview>
          <img
            src="/profile.jpg"
            alt="Your Name"
            className={styles.avatar}
          />
        </CardPreview>
        <CardHeader header={<span className={styles.name}>Your Name</span>} />
        <Body1 className={styles.bio}>
          Hi! I'm Your Name, a passionate developer and blogger. Welcome to my blog where I share insights, tutorials, and stories about web development and technology.
        </Body1>
      </Card>
    </div>
  );
};

export default About;
