
import { Link } from 'react-router-dom';
import { makeStyles, Body1, Title2, Subtitle1, Button, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    width: '100vw',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f3f4f6 0%, #e0e7ef 100%)',
    paddingTop: '3.5rem',
    paddingBottom: '4rem',
    '@media (prefers-color-scheme: dark)': { background: 'linear-gradient(135deg, #171717 0%, #262626 100%)' },
  },
  container: {
    width: '100%',
    maxWidth: '1100px',
    padding: '0 1rem',
    boxSizing: 'border-box',
  },
  hero: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '1rem',
    marginBottom: '2rem',
  },
  heroInner: {
    background: 'rgba(255,255,255,0.9)',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 12px 30px rgba(2,6,23,0.06)',
    '@media (prefers-color-scheme: dark)': { background: 'rgba(23,23,23,0.72)' },
  },
  title: { color: '#0f172a', '@media (prefers-color-scheme: dark)': { color: tokens.colorNeutralForeground1 } },
  subtitle: { color: '#475569', marginTop: '0.5rem', '@media (prefers-color-scheme: dark)': { color: tokens.colorNeutralForeground3 } },
  columns: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '1.5rem',
    marginTop: '1.5rem',
    '@media (max-width: 880px)': { gridTemplateColumns: '1fr' },
  },
  section: {
    background: 'rgba(255,255,255,0.9)',
    padding: '1.25rem',
    borderRadius: '10px',
    boxShadow: '0 8px 20px rgba(2,6,23,0.04)',
    '@media (prefers-color-scheme: dark)': { background: 'rgba(23,23,23,0.64)' },
  },
  sectionTitle: { fontWeight: 700, marginBottom: '0.5rem' },
  list: { margin: 0, paddingLeft: '1.15rem' },
  teamGrid: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.75rem', '@media (max-width:600px)': { gridTemplateColumns: '1fr' } },
  teamCard: { padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', display: 'flex', gap: '0.75rem', alignItems: 'center' },
  avatarSmall: { width: '48px', height: '48px', borderRadius: '8px', background: '#c7d2fe', display: 'inline-block' },
  ctaRow: { display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center' },
  muted: { color: '#6b7280' },
});

export default function About() {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <section className={styles.hero} aria-label="About Lumora hero">
          <div className={styles.heroInner}>
            <Title2 className={styles.title}>Lumora — home of our ideas, information and experience</Title2>
            <Subtitle1 className={styles.subtitle}>
              We collect and share practical knowledge about building software, writing, and running a modern web presence. Our posts, guides and stories are driven by real experiences and designed to help you ship better products.
            </Subtitle1>
            <Body1 style={{ marginTop: '1rem' }} className={styles.muted}>
              Lumora is a place where thoughtful writing meets practical engineering. We publish tutorials, design notes, and long-form articles about developer tools, product thinking and content strategy.
            </Body1>
            <div className={styles.ctaRow}>
              <Link to="/blogs"><Button appearance="primary">Explore posts</Button></Link>
              <Link to="/contact"><Button appearance="transparent">Contact us</Button></Link>
            </div>
          </div>
        </section>

        <div className={styles.columns}>
          <div>
            <section className={styles.section} aria-labelledby="mission">
              <h3 id="mission" className={styles.sectionTitle}>Our mission</h3>
              <Body1 className={styles.muted}>
                To share clear, actionable knowledge that helps developers and teams make better technical and product decisions. We focus on approachable explanations, practical examples, and lessons learned from building real projects.
              </Body1>
            </section>

            <section style={{ marginTop: '1rem' }} className={styles.section} aria-labelledby="what">
              <h3 id="what" className={styles.sectionTitle}>What we publish</h3>
              <ul className={styles.list}>
                <li>How-to tutorials and code walkthroughs</li>
                <li>Case studies and postmortems</li>
                <li>Opinion pieces about tooling and process</li>
                <li>Resources and recommended reading</li>
              </ul>
            </section>

            <section style={{ marginTop: '1rem' }} className={styles.section} aria-labelledby="history">
              <h3 id="history" className={styles.sectionTitle}>Our story</h3>
              <Body1 className={styles.muted}>
                Started as a personal blog, Lumora grew into a curated space for sharing knowledge across engineering and product. Over time we expanded to include guest posts, tutorials, and community contributions.
              </Body1>
            </section>
          </div>

          <aside>
            <section className={styles.section} aria-labelledby="team">
              <h3 id="team" className={styles.sectionTitle}>Team & contributors</h3>
              <div className={styles.teamGrid}>
                <div className={styles.teamCard}><div className={styles.avatarSmall} aria-hidden />
                  <div>
                    <div style={{ fontWeight: 700 }}>Stiliyan</div>
                    <div style={{ fontSize: '0.9rem' }} className={styles.muted}>Founder • Engineering</div>
                  </div>
                </div>
                <div className={styles.teamCard}><div className={styles.avatarSmall} aria-hidden />
                  <div>
                    <div style={{ fontWeight: 700 }}>Lumora Team</div>
                    <div style={{ fontSize: '0.9rem' }} className={styles.muted}>Writers & contributors</div>
                  </div>
                </div>
              </div>
            </section>

            <section style={{ marginTop: '1rem' }} className={styles.section} aria-labelledby="stats">
              <h3 id="stats" className={styles.sectionTitle}>Quick facts</h3>
              <ul className={styles.list}>
                <li>Articles: 120+</li>
                <li>Years publishing: 5+</li>
                <li>Contributors: 10+</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
